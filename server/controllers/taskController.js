import asyncHandler from "express-async-handler";
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import Activity from "../models/activityModel.js";

const createTask = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;
    const { 
      title, 
      team, 
      stage, 
      date, 
      priority, 
      assets, 
      links, 
      description,
      startDate,
      dueDate,
      reminders,
      dependencies,
      estimatedHours
    } = req.body;

    // Check if user can create tasks (Admin or Project Manager)
    const user = await User.findById(userId);
    if (!user.isAdmin && !user.isProjectManager) {
      return res.status(403).json({ 
        status: false, 
        message: "Only Project Managers and Admins can create tasks." 
      });
    }

    //alert users of the task
    let text = "New task has been assigned to you";
    if (team?.length > 1) {
      text = text + ` and ${team?.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set a ${priority} priority, so check and act accordingly. The task date is ${new Date(
        date
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "assigned",
      activity: text,
      by: userId,
    };
    let newLinks = null;

    if (links) {
      newLinks = links?.split(",");
    }

    // Đảm bảo project manager luôn nằm trong team khi tạo task mới
    let teamWithPM = Array.isArray(team) ? [...team] : [];
    const pmInTeam = teamWithPM.some(memberId => 
      memberId.toString() === userId.toString()
    );
    
    if (!pmInTeam) {
      teamWithPM.push(userId);
      console.log(`✅ Added PM to team during task creation. Team:`, teamWithPM);
    } else {
      console.log(`✅ PM already in team during creation. No duplicate added.`);
    }

    const task = await Task.create({
      title,
      projectManager: userId, // Set the creator as Project Manager
      team: teamWithPM,
      stage: stage.toLowerCase(),
      date,
      priority: priority.toLowerCase(),
      assets,
      activities: [], // Để rỗng, không truyền object
      links: newLinks || [],
      description,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      reminders: reminders || [],
      dependencies: dependencies || [],
      estimatedHours: estimatedHours || null,
    });

    // Tạo activity cho task mới
    const newActivity = await Activity.create({
      type: "assigned",
      activity: text,
      by: userId,
      task: task._id,
    });

    // Thêm activityId vào mảng activities của Task
    task.activities.push(newActivity._id);
    await task.save();

    // Tạo notifications cho team members
    if (team && team.length > 0) {
      for (const memberId of team) {
        if (memberId) {
          // Tạo notification cho từng thành viên
          await Notification.create({
            recipient: memberId,
            sender: userId,
            type: "task_assigned",
            title: "New Task Assigned",
            message: `You have been assigned to task: ${title}`,
            task: task._id.toString(),
            metadata: {
              dueDate: dueDate ? new Date(dueDate) : null,
              priority: priority.toLowerCase(),
              stage: stage.toLowerCase(),
            },
          });
          // Emit socket event kèm unreadCount
          const io = req.app.get("io");
          if (io) {
            const count = await Notification.countDocuments({ recipient: memberId, isRead: false });
            io.to(`user-${memberId}`).emit("notification-new", { userId: memberId, unreadCount: count });
          }
        }
      }
      // Tạo Notice cho từng thành viên (nếu Notice dùng chung schema Notification)
      for (const memberId of team) {
        if (memberId) {
          await Notice.create({
            recipient: memberId,
            sender: userId,
            type: "task_assigned",
            title: "New Task Assigned",
            message: text,
            task: task._id.toString(),
            metadata: {
              dueDate: dueDate ? new Date(dueDate) : null,
              priority: priority.toLowerCase(),
              stage: stage.toLowerCase(),
            },
          });
        }
      }
    }

    const users = await User.find({
      _id: team,
    });

    if (users) {
      for (let i = 0; i < users.length; i++) {
        const user = users[i];

        await User.findByIdAndUpdate(user._id, { $push: { tasks: task._id } });
      }
    }

    res
      .status(200)
      .json({ status: true, task, message: "Task created successfully." });

    // Emit realtime event cho room team (member sẽ nhận được nếu đang join team)
    const io = req.app.get("io");
    if (io) {
      // Lấy teamId là userId của PM (giả sử mỗi team có 1 PM)
      io.to(`team-${userId}`).emit("task-updated-team", { taskId: task._id });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { 
    title, 
    date, 
    team, 
    stage, 
    priority, 
    assets, 
    links, 
    description,
    startDate,
    dueDate,
    reminders,
    dependencies,
    estimatedHours
  } = req.body;

  try {
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    // Get user details to check permissions
    const user = await User.findById(userId);
    
    // Check if user can update this task
    const canUpdate = user.isAdmin || task.projectManager.toString() === userId;
    
    if (!canUpdate) {
      return res.status(403).json({ 
        status: false, 
        message: "Only the Project Manager or Admin can update this task" 
      });
    }

    let newLinks = [];

    if (links) {
      newLinks = links.split(",");
    }

    // Đảm bảo project manager luôn nằm trong team khi update task
    let teamWithPM = Array.isArray(team) ? [...team] : [];
    const pmInTeam = teamWithPM.some(memberId => 
      memberId.toString() === task.projectManager.toString()
    );
    
    if (!pmInTeam) {
      teamWithPM.push(task.projectManager);
      console.log(`✅ Added PM to team during task update. Team:`, teamWithPM);
    } else {
      console.log(`✅ PM already in team during update. No duplicate added.`);
    }
    
    task.team = teamWithPM;

    // Kiểm tra nếu due date thay đổi
    const dueDateChanged = task.dueDate?.getTime() !== (dueDate ? new Date(dueDate).getTime() : null);

    task.title = title;
    task.date = date;
    task.priority = priority.toLowerCase();
    task.assets = assets;
    task.stage = stage.toLowerCase();
    task.team = team;
    task.links = newLinks;
    task.description = description;
    task.startDate = startDate ? new Date(startDate) : null;
    task.dueDate = dueDate ? new Date(dueDate) : null;
    task.reminders = reminders || task.reminders;
    task.dependencies = dependencies || task.dependencies;
    task.estimatedHours = estimatedHours || task.estimatedHours;

    // Nếu task được hoàn thành, cập nhật completedAt
    if (stage.toLowerCase() === "completed" && task.stage !== "completed") {
      // Set completedAt with +7h timezone adjustment
      task.completedAt = new Date(Date.now() + 7 * 60 * 60 * 1000);
    }

    await task.save();

    // Tạo activity cho due date change
    if (dueDateChanged) {
      const newActivity = await Activity.create({
        type: "due_date_updated",
        activity: `Due date updated to ${new Date(dueDate).toDateString()}`,
        by: req.user.userId,
        task: id,
      });

      // Thêm activityId vào mảng activities của Task
      task.activities.push(newActivity._id);
      await task.save();
    }

    // Emit realtime event
    const io = req.app.get("io");
    if (io) {
      io.to(`task-${id}`).emit("task-updated", { taskId: id });
      io.emit("task-updated-global", { taskId: id }); // Thêm dòng này
    }

    res
      .status(200)
      .json({ status: true, message: "Task updated successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const getTasks = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { stage, isTrashed, search } = req.query;

  // Get user details to check permissions
  const user = await User.findById(userId);
  
  let query = { isTrashed: isTrashed ? true : false };

  // Determine what tasks user can see based on their role
  if (user.isAdmin) {
    // Admin can see all tasks
  } else if (user.isProjectManager) {
    // Project Manager chỉ thấy task mình tạo
    query.projectManager = userId;
  } else {
    // Regular members chỉ thấy task mình tham gia
    query.team = { $all: [userId] };
  }

  if (stage) {
    query.stage = stage;
  }

  if (search) {
    const searchQuery = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { stage: { $regex: search, $options: "i" } },
        { priority: { $regex: search, $options: "i" } },
      ],
    };
    query = { ...query, ...searchQuery };
  }

  let queryResult = Task.find(query)
    .populate({
      path: "projectManager",
      select: "name title email",
    })
    .populate({
      path: "team",
      select: "name title email",
    })
    .populate({
      path: "subTasks",
      select: "title date dueDate tag isCompleted dependencies",
    })
    .sort({ _id: -1 });

  const tasks = await queryResult;

  res.status(200).json({
    status: true,
    tasks,
  });
});

const getTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Get user details to check permissions
    const user = await User.findById(userId);

    const task = await Task.findById(id)
      .populate({
        path: "projectManager",
        select: "name title role email",
      })
      .populate({
        path: "team",
        select: "name title role email",
      })
      .populate({
        path: "activities",
        populate: {
          path: "by",
          select: "name email",
        }
      })
      .populate({
        path: "subTasks",
        select: "title date dueDate tag isCompleted dependencies",
      })
      .populate({
        path: "reminders",
      })
      .populate({
        path: "dependencies",
        select: "title stage dueDate",
      })
      .populate({
        path: "comments",
        populate: [
          {
            path: "author",
            select: "name email",
          },
          {
            path: "mentions",
            select: "name email",
          }
        ]
      })
      .sort({ _id: -1 });

    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    // Lọc bỏ các comment bị null/undefined hoặc thiếu author
    if (task.comments && Array.isArray(task.comments)) {
      task.comments = task.comments.filter(comment => 
        comment && comment.author && comment.author.name
      );
    }

    // Lọc bỏ các activity bị null/undefined
    if (task.activities && Array.isArray(task.activities)) {
      task.activities = task.activities.filter(activity => 
        activity && activity.by && activity.by.name
      );
    }

    // Lọc bỏ các subTask bị null/undefined
    if (task.subTasks && Array.isArray(task.subTasks)) {
      task.subTasks = task.subTasks.filter(subTask => 
        subTask && subTask.title
      );
    }

    // Lọc bỏ các reminder bị null/undefined
    if (task.reminders && Array.isArray(task.reminders)) {
      task.reminders = task.reminders.filter(reminder => 
        reminder && reminder.time
      );
    }

    // Check if user has access to this task
    const hasAccess = user.isAdmin || 
                     task.projectManager._id.toString() === userId ||
                     task.team.some(member => member._id.toString() === userId);

    if (!hasAccess) {
      return res.status(403).json({ 
        status: false, 
        message: "You don't have permission to access this task" 
      });
    }

    res.status(200).json({
      status: true,
      task,
    });
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch task", error);
  }
});

const trashTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findById(id);

    task.isTrashed = true;

    await task.save();

    res.status(200).json({
      status: true,
      message: `Task trashed successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const getPerformanceReport = asyncHandler(async (req, res) => {
  try {
    const { userId, isAdmin, isProjectManager } = req.user;
    const { startDate, endDate, memberId } = req.query;

    let query = { isTrashed: false };

    if (!isAdmin) {
      query.team = { $all: [userId] };
    } else if (memberId) {
      query.team = { $all: [memberId] };
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const tasks = await Task.find(query)
      .populate({
        path: "team",
        select: "name title email",
      })
      .sort({ createdAt: -1 });

    // Tính toán các chỉ số
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.stage === "completed").length;
    const overdueTasks = tasks.filter(task => 
      task.dueDate && task.dueDate < new Date() && task.stage !== "completed"
    ).length;
    
    const avgCompletionTime = tasks
      .filter(task => task.completedAt && task.createdAt)
      .reduce((acc, task) => {
        const completionTime = task.completedAt - task.createdAt;
        return acc + completionTime;
      }, 0) / Math.max(completedTasks, 1);

    // Phân tích theo priority
    const priorityStats = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    // Phân tích theo stage
    const stageStats = tasks.reduce((acc, task) => {
      acc[task.stage] = (acc[task.stage] || 0) + 1;
      return acc;
    }, {});

    // Phân tích theo member (admin: all users, pm: only team)
    let memberStats = [];
    if (isAdmin || isProjectManager) {
      let allUsers = [];
      if (isAdmin) {
        allUsers = await User.find({ isActive: true }).select("name email");
      } else if (isProjectManager) {
        const currentUser = await User.findById(userId);
        allUsers = await User.find({ _id: { $in: currentUser.team }, isActive: true }).select("name email");
      }
      memberStats = allUsers.map(user => {
        const userTasks = tasks.filter(task => 
          task.team.some(member => member._id.toString() === user._id.toString())
        );
        return {
          user: { name: user.name, email: user.email },
          totalTasks: userTasks.length,
          completedTasks: userTasks.filter(task => task.stage === "completed").length,
          overdueTasks: userTasks.filter(task => 
            task.dueDate && task.dueDate < new Date() && task.stage !== "completed"
          ).length,
        };
      });
    }

    res.status(200).json({
      status: true,
      report: {
        totalTasks,
        completedTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(2) : 0,
        avgCompletionTime: Math.round(avgCompletionTime / (1000 * 60 * 60 * 24)), // Convert to days
        priorityStats,
        stageStats,
        memberStats,
      },
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

export {
  createTask,
  getTask,
  getTasks,
  updateTask,
  trashTask,
  getPerformanceReport
};
