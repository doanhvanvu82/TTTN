import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { createServer } from "http";
import { errorHandler, routeNotFound } from "./middleware/errorMiddleware.js";
import dbConnection from "./utils/connectDB.js";
import routes from "./routes/index.js";

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

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    console.log("Total connections:", io.engine.clientsCount);
  });
});

// Make io available globally
app.set("io", io);

const port = process.env.PORT || 8282;

const app = express();
const server = createServer(app);

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
