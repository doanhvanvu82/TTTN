import asyncHandler from "express-async-handler";
import Notice from "../models/notisModel.js";
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notisModel.js";
import Activity from "../models/activityModel.js";
import Comment from "../models/commentModel.js";
import Reminder from "../models/reminderModel.js";
import SubTask from "../models/subTaskModel.js";

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

const duplicateTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    console.log(`=== DUPLICATE TASK ===`);
    console.log(`Original task:`, {
      id: task._id,
      title: task.title,
      projectManager: task.projectManager,
      team: task.team
    });

    //alert users of the task
    let text = "New task has been assigned to you";
    if (task.team?.length > 1) {
      text = text + ` and ${task.team?.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set a ${
        task.priority
      } priority, so check and act accordingly. The task date is ${new Date(
        task.date
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "assigned",
      activity: text,
      by: userId,
    };

    // Đảm bảo PM luôn có trong team khi duplicate task
    let teamWithPM = Array.isArray(task.team) ? [...task.team] : [];
    const pmInTeam = teamWithPM.some(memberId => 
      memberId.toString() === task.projectManager.toString()
    );
    
    if (!pmInTeam) {
      teamWithPM.push(task.projectManager);
      console.log(`✅ Added PM to team during task duplication. Team:`, teamWithPM);
    } else {
      console.log(`✅ PM already in team during duplication. No duplicate added.`);
    }

    const taskData = {
      title: "Duplicate - " + task.title,
      projectManager: task.projectManager, // Đảm bảo projectManager được set
      team: teamWithPM,
      stage: task.stage,
      date: task.date,
      priority: task.priority,
      assets: task.assets || [],
      links: task.links || [],
      description: task.description || "",
      startDate: task.startDate,
      dueDate: task.dueDate,
      reminders: task.reminders || [],
      dependencies: task.dependencies || [],
      estimatedHours: task.estimatedHours,
      activities: [], // Để rỗng, không truyền object
      subTasks: [], // Để rỗng, sẽ tạo subtask mới sau
    };

    console.log(`New task data:`, taskData);

    const newTask = await Task.create(taskData);

    console.log(`✅ Task duplicated successfully:`, {
      id: newTask._id,
      title: newTask.title,
      projectManager: newTask.projectManager,
      team: newTask.team
    });

    // Tạo activity cho task duplicated
    const newActivity = await Activity.create({
      type: "assigned",
      activity: text,
      by: userId,
      task: newTask._id,
    });

    // Thêm activityId vào mảng activities của Task
    newTask.activities.push(newActivity._id);

    // Duplicate subtasks nếu có
    if (task.subTasks && task.subTasks.length > 0) {
      // Populate subtasks để lấy thông tin đầy đủ
      const originalSubTasks = await SubTask.find({ _id: { $in: task.subTasks } });
      
      for (const originalSubTask of originalSubTasks) {
        const newSubTask = await SubTask.create({
          title: originalSubTask.title,
          date: originalSubTask.date,
          dueDate: originalSubTask.dueDate,
          tag: originalSubTask.tag,
          isCompleted: false, // Reset trạng thái về false
          dependencies: originalSubTask.dependencies || [],
          task: newTask._id,
        });
        
        // Thêm subTaskId vào mảng subTasks của Task
        newTask.subTasks.push(newSubTask._id);
      }
    }

    await newTask.save();

    // Tạo notifications cho team members của task duplicated
    if (newTask.team && newTask.team.length > 0) {
      for (const memberId of newTask.team) {
        if (memberId && memberId.toString() !== userId.toString()) {
          // Tạo notification cho từng thành viên (trừ PM)
          await Notification.create({
            recipient: memberId,
            sender: userId,
            type: "task_assigned",
            title: "Task Duplicated",
            message: `Task "${newTask.title}" has been duplicated and assigned to you.`,
            task: newTask._id.toString(),
            metadata: {
              dueDate: newTask.dueDate,
              priority: newTask.priority,
              stage: newTask.stage,
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
    }

    // Emit realtime events for task duplication
    const io = req.app.get("io");
    if (io) {
      // Emit task-specific event
      io.to(`task-${newTask._id}`).emit("task-added", { taskId: newTask._id });
      // Emit global event để BoardView có thể nhận được
      io.emit("task-added-global", { taskId: newTask._id });
      console.log(`Emitted task-added events for duplicated task ${newTask._id}`);
    }

    res
      .status(200)
      .json({ status: true, message: "Task duplicated successfully." });
  } catch (error) {
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

const updateTaskStage = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { stage } = req.body;

    const task = await Task.findById(id).populate('dependencies', 'stage title');
    
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    // Get user details to check permissions
    const user = await User.findById(userId);
    
    // Check if user can update task stage
    const canUpdateStage = user.isAdmin || 
                          task.projectManager.toString() === userId ||
                          task.team.some(member => member.toString() === userId);
    
    if (!canUpdateStage) {
      return res.status(403).json({ 
        status: false, 
        message: "You don't have permission to update this task" 
      });
    }

    const oldStage = task.stage;
    const newStage = stage.toLowerCase();

    // Kiểm tra workflow nghiêm ngặt
    const validTransitions = {
      'todo': ['in progress'],
      'in progress': ['completed'],
      'completed': [] // Không thể chuyển từ completed sang stage khác
    };

    if (!validTransitions[oldStage]?.includes(newStage)) {
      return res.status(400).json({
        status: false,
        message: `Invalid stage transition. Can only move from '${oldStage}' to: ${validTransitions[oldStage]?.join(', ') || 'none'}`
      });
    }

    // Kiểm tra dependencies nếu chuyển sang 'in progress' hoặc 'completed'
    if (newStage === 'in progress' || newStage === 'completed') {
      if (task.dependencies && task.dependencies.length > 0) {
        const incompleteDependencies = task.dependencies.filter(dep => dep.stage !== 'completed');
        
        if (incompleteDependencies.length > 0) {
          const dependencyNames = incompleteDependencies.map(dep => dep.title).join(', ');
          return res.status(400).json({
            status: false,
            message: `Cannot change stage. The following dependencies must be completed first: ${dependencyNames}`
          });
        }
      }
    }

    task.stage = newStage;

    // Nếu task được hoàn thành, cập nhật completedAt
    if (newStage === "completed" && oldStage !== "completed") {
      // Set completedAt with +7h timezone adjustment
      task.completedAt = new Date(Date.now() + 7 * 60 * 60 * 1000);
    }

    await task.save();

    // Emit realtime event
    const io = req.app.get("io");
    if (io) {
      io.to(`task-${id}`).emit("task-stage-changed", { taskId: id, stage: task.stage });
      io.emit("task-stage-changed-global", { taskId: id, stage: task.stage }); // Thêm dòng này
    }

    // Kiểm tra dependencies và thông báo cho các task phụ thuộc
    if (newStage === "completed") {
      const dependentTasks = await Task.find({ dependencies: id });
      
      for (const dependentTask of dependentTasks) {
        // Tạo notification cho team members của task phụ thuộc
        for (const memberId of dependentTask.team) {
          await Notification.create({
            recipient: memberId,
            sender: req.user.userId,
            type: "dependency_completed",
            title: "Dependency Completed",
            message: `Task "${task.title}" has been completed. You can now start working on "${dependentTask.title}".`,
            task: dependentTask._id.toString(),
          });
        }
      }
    }

    res
      .status(200)
      .json({ status: true, message: "Task stage changed successfully." });
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

const deleteRestoreTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType } = req.query;
    const io = req.app.get("io");
    let affectedTaskId = id;

    if (actionType === "delete") {
      // Cascade delete: Xóa toàn bộ entity liên quan trước khi xóa task
      
      // Xóa comments
      await Comment.deleteMany({ task: id });
      console.log(`✅ Deleted comments for task: ${id}`);

      // Xóa activities
      await Activity.deleteMany({ task: id });
      console.log(`✅ Deleted activities for task: ${id}`);

      // Xóa reminders
      await Reminder.deleteMany({ task: id });
      console.log(`✅ Deleted reminders for task: ${id}`);

      // Xóa subtasks
      await SubTask.deleteMany({ task: id });
      console.log(`✅ Deleted subtasks for task: ${id}`);

      // Cuối cùng xóa task
      await Task.findByIdAndDelete(id);
      console.log(`✅ Deleted task: ${id}`);

      if (io) io.to(`task-${id}`).emit("task-deleted", { taskId: id });
    } else if (actionType === "deleteAll") {
      // Cascade delete cho tất cả task trong trash
      
      // Lấy danh sách task IDs sẽ bị xóa
      const tasksToDelete = await Task.find({ isTrashed: true }).select('_id');
      const taskIds = tasksToDelete.map(task => task._id);

      if (taskIds.length > 0) {
        // Xóa comments
        await Comment.deleteMany({ task: { $in: taskIds } });
        console.log(`✅ Deleted comments for ${taskIds.length} tasks`);

        // Xóa activities
        await Activity.deleteMany({ task: { $in: taskIds } });
        console.log(`✅ Deleted activities for ${taskIds.length} tasks`);

        // Xóa reminders
        await Reminder.deleteMany({ task: { $in: taskIds } });
        console.log(`✅ Deleted reminders for ${taskIds.length} tasks`);

        // Xóa subtasks
        await SubTask.deleteMany({ task: { $in: taskIds } });
        console.log(`✅ Deleted subtasks for ${taskIds.length} tasks`);
      }

      // Xóa tasks
      await Task.deleteMany({ isTrashed: true });
      console.log(`✅ Deleted ${taskIds.length} tasks from trash`);
    } else if (actionType === "restore") {
      const resp = await Task.findById(id);
      resp.isTrashed = false;
      resp.save();
      if (io) io.to(`task-${id}`).emit("task-updated", { taskId: id });
    } else if (actionType === "restoreAll") {
      await Task.updateMany(
        { isTrashed: true },
        { $set: { isTrashed: false } }
      );
      // Không emit từng task, có thể emit global nếu muốn
    }

    res.status(200).json({
      status: true,
      message: `Operation performed successfully.`,
    });
  } catch (error) {
    console.error("Error in deleteRestoreTask:", error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

const dashboardStatistics = asyncHandler(async (req, res) => {
  try {
    const { userId, isAdmin, isProjectManager } = req.user;
    const currentUser = await User.findById(userId);

    // Fetch all tasks from the database
    const allTasks = isAdmin
      ? await Task.find({
          isTrashed: false,
        })
          .populate({
            path: "team",
            select: "name role title email",
          })
          .sort({ _id: -1 })
      : await Task.find({
          isTrashed: false,
          team: { $all: [userId] },
        })
          .populate({
            path: "team",
            select: "name role title email",
          })
          .sort({ _id: -1 });

    let users = [];
    if (isAdmin) {
      users = await User.find({ isActive: true })
        .select("name title role isActive createdAt")
        .limit(10)
        .sort({ _id: -1 });
    } else if (isProjectManager) {
      users = await User.find({ _id: { $in: currentUser.team }, isActive: true })
        .select("name title role isActive createdAt")
        .limit(10)
        .sort({ _id: -1 });
    }

    // Group tasks by stage and calculate counts
    const groupedTasks = allTasks?.reduce((result, task) => {
      const stage = task.stage;

      if (!result[stage]) {
        result[stage] = 1;
      } else {
        result[stage] += 1;
      }

      return result;
    }, {});

    const graphData = Object.entries(
      allTasks?.reduce((result, task) => {
        const { priority } = task;
        result[priority] = (result[priority] || 0) + 1;
        return result;
      }, {})
    ).map(([name, total]) => ({ name, total }));

    // Calculate total tasks
    const totalTasks = allTasks.length;
    const last10Task = allTasks?.slice(0, 10);

    // Combine results into a summary object
    const summary = {
      totalTasks,
      last10Task,
      users, // Trả về users cho admin và PM
      tasks: groupedTasks,
      graphData,
    };

    res
      .status(200)
      .json({ status: true, ...summary, message: "Successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

// Lấy tasks theo calendar view
const getTasksForCalendar = asyncHandler(async (req, res) => {
  try {
    const { userId, isAdmin } = req.user;
    const { startDate, endDate } = req.query;

    let query = { isTrashed: false };

    if (!isAdmin) {
      query.team = { $all: [userId] };
    }

    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const tasks = await Task.find(query)
      .populate({
        path: "team",
        select: "name title email",
      })
      .populate({
        path: "dependencies",
        select: "title stage",
      })
      .sort({ dueDate: 1 });

    res.status(200).json({
      status: true,
      tasks,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

// Performance reports
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

const getTaskTeam = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const task = await Task.findById(id).populate('team', 'name email _id').populate('projectManager', 'name email _id');
    if (!task) {
      return res.status(404).json({ status: false, message: 'Task not found.' });
    }
    // Kiểm tra quyền truy cập
    const isMember = task.team.some(member => member._id.toString() === userId.toString()) || task.projectManager._id.toString() === userId.toString();
    if (!isMember) {
      return res.status(403).json({ status: false, message: 'Not authorized.' });
    }
    // Gộp team và projectManager, loại trùng lặp
    const users = [
      ...task.team.map(u => ({ _id: u._id, name: u.name, email: u.email })),
      { _id: task.projectManager._id, name: task.projectManager.name, email: task.projectManager.email }
    ];
    // Loại trùng lặp theo _id
    const uniqueUsers = users.filter((u, idx, arr) => arr.findIndex(x => x._id.toString() === u._id.toString()) === idx);
    res.status(200).json({ status: true, users: uniqueUsers });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});


export {
  createTask,
  dashboardStatistics,
  deleteRestoreTask,
  duplicateTask,
  getTask,
  getTasks,
  updateTask,
  updateTaskStage,
  trashTask,
  getTasksForCalendar,
  getPerformanceReport,
  getTaskTeam,
};
