import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import { errorHandler, routeNotFound } from "./middleware/errorMiddleware.js";
import routes from "./routes/index.js";
import dbConnection from "./utils/connectDB.js";
import cron from "node-cron";
import Notification from "./models/notisModel.js";
import Reminder from "./models/reminderModel.js";

dotenv.config();

// Dummy notification/email sender
async function sendNotification(task, reminder, io) {
  // Gửi notification cho tất cả thành viên của task và project manager (không trùng lặp)
  const sender = task.projectManager._id || task.projectManager;
  
  // Lấy danh sách recipient IDs (không phải object)
  const recipients = [
    ...new Set([
      ...(task.team || []).map(member => member._id || member),
      task.projectManager._id || task.projectManager
    ])
  ];
  
  for (const recipient of recipients) {
    await Notification.create({
      recipient,
      sender,
      type: "reminder",
      title: "Task Reminder",
      message: reminder.message,
      task: task._id,
      metadata: {
        dueDate: task.dueDate,
        priority: task.priority,
        stage: task.stage,
      },
    });
    // Emit notification-new event kèm unreadCount
    if (io) {
      const count = await Notification.countDocuments({ recipient, isRead: false });
      io.to(`user-${recipient}`).emit("notification-new", { userId: recipient, unreadCount: count });
    }
  }
  console.log(`In-app notification sent to ${recipients.length} member(s) for task: ${task.title}`);
}

// Dummy email sender
async function sendEmail(task, reminder) {
  console.log(`Email reminder sent for task: ${task.title}`);
}

// Cron job: check reminders every minute
cron.schedule("* * * * *", async () => {
  const now = new Date();
  try {
    // Tìm tất cả reminders chưa được gửi và đã đến giờ
    const reminders = await Reminder.find({ 
      sent: false, 
      time: { $lte: now } 
    }).populate({
      path: 'task',
      populate: [
        { path: 'projectManager', select: '_id' },
        { path: 'team', select: '_id' }
      ]
    });

    for (const reminder of reminders) {
      if (reminder.task) {
        if (reminder.type === "in-app") {
          await sendNotification(reminder.task, reminder, io);
        } else if (reminder.type === "email") {
          await sendEmail(reminder.task, reminder);
        }
        
        // Đánh dấu reminder đã được gửi
        reminder.sent = true;
        await reminder.save();
        
        // Emit event reminder-sent
        if (io) {
          io.to(`task-${reminder.task._id}`).emit("reminder-sent", { 
            taskId: reminder.task._id, 
            reminderId: reminder._id 
          });
        }
        
        console.log(`✅ Reminder sent for task: ${reminder.task.title}`);
      }
    }
  } catch (err) {
    console.error("[CRON] Reminder check error:", err);
  }
});

const port = process.env.PORT || 8282;

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  console.log("Total connections:", io.engine.clientsCount);

  // Join user room for real-time notification updates
  socket.on("join-user", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${socket.id} joined user room user-${userId}`);
    console.log(`Room user-${userId} has ${io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0} connections`);
    
    // Log tất cả rooms mà socket này đang tham gia
    const userRooms = Array.from(socket.rooms).filter(room => room.startsWith('user-'));
    console.log(`User ${socket.id} is now in user rooms:`, userRooms);
  });

  // Leave user room
  socket.on("leave-user", (userId) => {
    socket.leave(`user-${userId}`);
    console.log(`User ${socket.id} left user room user-${userId}`);
    console.log(`Room user-${userId} has ${io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0} connections`);
  });

  // Join task room for real-time updates
  socket.on("join-task", (taskId) => {
    socket.join(`task-${taskId}`);
    console.log(`User ${socket.id} joined task ${taskId}`);
  });

  // Leave task room
  socket.on("leave-task", (taskId) => {
    socket.leave(`task-${taskId}`);
    console.log(`User ${socket.id} left task ${taskId}`);
  });

  // Join team room for real-time team updates
  socket.on("join-team", (teamId) => {
    socket.join(`team-${teamId}`);
    console.log(`User ${socket.id} joined team room team-${teamId}`);
  });

  // Comment events
  socket.on("comment-added", (data) => {
    socket.to(`task-${data.taskId}`).emit("new-comment", data);
  });
  socket.on("comment-updated", (data) => {
    socket.to(`task-${data.taskId}`).emit("comment-updated", data);
  });
  socket.on("comment-deleted", (data) => {
    socket.to(`task-${data.taskId}`).emit("comment-deleted", data);
  });

  // Task events
  socket.on("task-updated", (data) => {
    socket.to(`task-${data.taskId}`).emit("task-updated", data);
  });
  socket.on("task-deleted", (data) => {
    socket.to(`task-${data.taskId}`).emit("task-deleted", data);
  });
  socket.on("task-stage-changed", (data) => {
    socket.to(`task-${data.taskId}`).emit("task-stage-changed", data);
  });

  // Subtask events
  socket.on("subtask-added", (data) => {
    socket.to(`task-${data.taskId}`).emit("subtask-added", data);
  });
  socket.on("subtask-updated", (data) => {
    socket.to(`task-${data.taskId}`).emit("subtask-updated", data);
  });
  socket.on("subtask-deleted", (data) => {
    socket.to(`task-${data.taskId}`).emit("subtask-deleted", data);
  });

  // Reminder events
  socket.on("reminder-added", (data) => {
    socket.to(`task-${data.taskId}`).emit("reminder-added", data);
  });
  socket.on("reminder-deleted", (data) => {
    socket.to(`task-${data.taskId}`).emit("reminder-deleted", data);
  });

  // Notification events (emit to user room)
  socket.on("notification-new", (data) => {
    socket.to(`user-${data.userId}`).emit("notification-new", data);
  });
  socket.on("notification-deleted", (data) => {
    socket.to(`user-${data.userId}`).emit("notification-deleted", data);
  });
  socket.on("notification-read", (data) => {
    socket.to(`user-${data.userId}`).emit("notification-read", data);
  });

  // Activity log
  socket.on("activity-added", (data) => {
    socket.to(`task-${data.taskId}`).emit("activity-added", data);
  });
  socket.on("activity-deleted", (data) => {
    socket.to(`task-${data.taskId}`).emit("activity-deleted", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    console.log("Total connections:", io.engine.clientsCount);
  });
});

// Make io available globally
app.set("io", io);

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("API is running....");
});

app.use(routeNotFound);
app.use(errorHandler);

dbConnection();

server.listen(port, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
});
