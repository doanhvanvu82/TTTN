import asyncHandler from "express-async-handler";
import Notice from "../models/notisModel.js";
import User from "../models/userModel.js";
import createJWT from "../utils/index.js";
import Notification from "../models/notisModel.js";

// POST request - login user
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res
      .status(401)
      .json({ status: false, message: "Invalid email or password." });
  }

  if (!user?.isActive) {
    return res.status(401).json({
      status: false,
      message: "User account has been deactivated, contact the administrator",
    });
  }

  const isMatch = await user.matchPassword(password);

  if (user && isMatch) {
    createJWT(res, user._id);

    user.password = undefined;

    res.status(200).json(user);
  } else {
    return res
      .status(401)
      .json({ status: false, message: "Invalid email or password" });
  }
});

// POST - Register a new user
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, title, company } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res
      .status(400)
      .json({ status: false, message: "Email address already exists" });
  }

  // Determine user role and permissions
  let userRole = "member";
  let isProjectManager = false;
  let isAdmin = false;

  if (role === "project_manager") {
    userRole = "project_manager";
    isProjectManager = true;
  } else if (role === "admin") {
    userRole = "admin";
    isAdmin = true;
  }

  // Create user with appropriate settings
  const user = await User.create({
    name,
    email,
    password,
    role: userRole,
    title: title || "",
    company: company || "",
    isAdmin,
    isProjectManager,
    isActive: true, // Allow immediate login
  });

  if (user) {
    // Auto-login after registration, chỉ khi không phải admin đang thêm user
    if (!req.user || !req.user.isAdmin) {
      createJWT(res, user._id);
    }
    user.password = undefined;
    res.status(201).json({
      status: true,
      message: "Account created successfully! Welcome to our platform.",
      user
    });
  } else {
    return res
      .status(400)
      .json({ status: false, message: "Invalid user data" });
  }
});

// POST -  Logout user / clear cookie
const logoutUser = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};

// @GET -   Get user profile
// const getUserProfile = asyncHandler(async (req, res) => {
//   const { userId } = req.user;

//   const user = await User.findById(userId);

//   user.password = undefined;

//   if (user) {
//     res.json({ ...user });
//   } else {
//     res.status(404);
//     throw new Error("User not found");
//   }
// });

const getTeamList = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const { userId } = req.user;
  let query = {};

  // Lấy thông tin user hiện tại
  const currentUser = await User.findById(userId);

  if (currentUser.isAdmin) {
    // Admin lấy toàn bộ user
    if (search) {
      const searchQuery = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
          { role: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
      query = { ...query, ...searchQuery };
    }
    const user = await User.find(query).select("name title role email isActive");
    return res.status(201).json(user);
  } else if (currentUser.isProjectManager) {
    // PM chỉ lấy user trong team của mình
    let userQuery = { _id: { $in: currentUser.team } };
    if (search) {
      const searchQuery = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
          { role: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
      userQuery = { ...userQuery, ...searchQuery };
    }
    const users = await User.find(userQuery).select("name title role email isActive");
    return res.status(201).json(users);
  } else {
    // Member chỉ lấy chính mình
    const user = await User.findById(userId).select("name title role email isActive");
    return res.status(201).json([user]);
  }
});

// Lấy danh sách team của project manager hiện tại
const getPMTeamList = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const currentUser = await User.findById(userId);

  if (!currentUser.isProjectManager) {
    return res.status(403).json({ message: "Only project managers can access this resource." });
  }

  // Lấy các user trong team của PM
  const users = await User.find({ _id: { $in: currentUser.team } })
    .select("name title role email isActive");

  res.status(200).json(users);
});

// @GET  - get user notifications
const getNotificationsList = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const notice = await Notice.find({
    team: userId,
    isRead: { $nin: [userId] },
  })
    .populate("task", "title")
    .sort({ _id: -1 });

  res.status(200).json(notice);
});

// @GET  - get user task status
const getUserTaskStatus = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const currentUser = await User.findById(userId);
  let users = [];
  if (currentUser.isAdmin) {
    users = await User.find().populate("tasks", "title stage").sort({ _id: -1 });
  } else if (currentUser.isProjectManager) {
    users = await User.find({ _id: { $in: currentUser.team } }).populate("tasks", "title stage").sort({ _id: -1 });
  } else {
    users = [await User.findById(userId).populate("tasks", "title stage")];
  }
  res.status(200).json(users);
});

// @GET  - get user notifications
const markNotificationRead = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;
    const { isReadType, id } = req.query;

    if (isReadType === "all") {
      await Notice.updateMany(
        { team: userId, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } },
        { new: true }
      );
    } else {
      await Notice.findOneAndUpdate(
        { _id: id, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } },
        { new: true }
      );
    }
    res.status(201).json({ status: true, message: "Done" });
  } catch (error) {
    console.log(error);
  }
});

// PUT - Update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
  const { userId, isAdmin } = req.user;
  const { _id } = req.body;

  const id =
    isAdmin && userId === _id
      ? userId
      : isAdmin && userId !== _id
      ? _id
      : userId;

  const user = await User.findById(id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.title = req.body.title || user.title;
    user.company = req.body.company || user.company;

    // Cập nhật role và quyền
    if (req.body.role === "project_manager") {
      user.isProjectManager = true;
      user.isAdmin = false;
      user.role = "project_manager";
    } else if (req.body.role === "admin") {
      user.isAdmin = true;
      user.isProjectManager = false;
      user.role = "admin";
    } else {
      user.isAdmin = false;
      user.isProjectManager = false;
      user.role = "member";
    }

    const updatedUser = await user.save();

    user.password = undefined;

    res.status(201).json({
      status: true,
      message: "Profile Updated Successfully.",
      user: updatedUser,
    });
  } else {
    res.status(404).json({ status: false, message: "User not found" });
  }
});

// PUT - active/disactivate user profile
const activateUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (user) {
    user.isActive = req.body.isActive;

    await user.save();

    user.password = undefined;

    res.status(201).json({
      status: true,
      message: `User account has been ${
        user?.isActive ? "activated" : "disabled"
      }`,
    });
  } else {
    res.status(404).json({ status: false, message: "User not found" });
  }
});

// POST - Create admin user (admin only)
const createAdminUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, title } = req.body;
  const { isAdmin } = req.user;

  // Only existing admins can create new admin users
  if (!isAdmin) {
    return res
      .status(403)
      .json({ status: false, message: "Only admins can create admin users" });
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res
      .status(400)
      .json({ status: false, message: "Email address already exists" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "admin",
    title: title || "Administrator",
    isAdmin: true,
    isActive: true,
  });

  if (user) {
    user.password = undefined;

    res.status(201).json({
      status: true,
      message: "Admin user created successfully!",
      user
    });
  } else {
    return res
      .status(400)
      .json({ status: false, message: "Invalid user data" });
  }
});

const changeUserPassword = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  // Remove this condition
  if (userId === "65ff94c7bb2de638d0c73f63") {
    return res.status(404).json({
      status: false,
      message: "This is a test user. You can not chnage password. Thank you!!!",
    });
  }

  const user = await User.findById(userId);

  if (user) {
    user.password = req.body.password;

    await user.save();

    user.password = undefined;

    res.status(201).json({
      status: true,
      message: `Password chnaged successfully.`,
    });
  } else {
    res.status(404).json({ status: false, message: "User not found" });
  }
});

// DELETE - delete user account
const deleteUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await User.findByIdAndDelete(id);

  res.status(200).json({ status: true, message: "User deleted successfully" });
});

// Lấy notifications của user
const getNotifications = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    let query = { recipient: userId };
    
    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate({
        path: "sender",
        select: "name email",
      })
      .populate({
        path: "task",
        select: "title stage",
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      status: true,
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

// Đánh dấu notification đã đọc
const markNotificationAsRead = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({ status: false, message: "Notification not found." });
    }

    notification.isRead = true;
    await notification.save();

    // Emit realtime event kèm unreadCount
    const io = req.app.get("io");
    if (io) {
      const count = await Notification.countDocuments({ recipient: userId, isRead: false });
      io.to(`user-${userId}`).emit("notification-read", { userId, notificationId, unreadCount: count });
    }

    res.status(200).json({
      status: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

// Đánh dấu tất cả notifications đã đọc
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    // Emit realtime event kèm unreadCount
    const io = req.app.get("io");
    if (io) {
      const count = await Notification.countDocuments({ recipient: userId, isRead: false });
      io.to(`user-${userId}`).emit("notification-read", { userId, all: true, unreadCount: count });
    }

    res.status(200).json({
      status: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

// Xóa notification
const deleteNotification = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({ status: false, message: "Notification not found." });
    }

    // Emit realtime event kèm unreadCount
    const io = req.app.get("io");
    if (io) {
      const count = await Notification.countDocuments({ recipient: userId, isRead: false });
      io.to(`user-${userId}`).emit("notification-deleted", { userId, notificationId, unreadCount: count });
    }

    res.status(200).json({
      status: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

// Xóa tất cả notifications của user
const deleteAllNotifications = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await Notification.deleteMany({
      recipient: userId,
    });

    // Emit realtime event kèm unreadCount
    const io = req.app.get("io");
    if (io) {
      io.to(`user-${userId}`).emit("notification-deleted", { userId, all: true, unreadCount: 0 });
    }

    res.status(200).json({
      status: true,
      message: `${result.deletedCount} notifications deleted successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

// Lấy số lượng notifications chưa đọc
const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;

    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.status(200).json({
      status: true,
      count,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

// POST - Add new user by admin (no auto-login, no set cookie)
const addUserByAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, role, title, company } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res
      .status(400)
      .json({ status: false, message: "Email address already exists" });
  }

  // Determine user role and permissions
  let userRole = "member";
  let isProjectManager = false;
  let isAdmin = false;

  if (role === "project_manager") {
    userRole = "project_manager";
    isProjectManager = true;
  } else if (role === "admin") {
    userRole = "admin";
    isAdmin = true;
  }

  // Create user with appropriate settings
  const user = await User.create({
    name,
    email,
    password,
    role: userRole,
    title: title || "",
    company: company || "",
    isAdmin,
    isProjectManager,
    isActive: true,
  });

  if (user) {
    user.password = undefined;
    res.status(201).json({
      status: true,
      message: "User added successfully!",
      user
    });
  } else {
    return res
      .status(400)
      .json({ status: false, message: "Invalid user data" });
  }
});

// Thêm user vào team của PM bằng email
const addUserToTeam = asyncHandler(async (req, res) => {
  const { userId } = req.user; // PM đang đăng nhập
  const { email } = req.body;

  const pm = await User.findById(userId);
  if (!pm || !pm.isProjectManager) {
    return res.status(403).json({ status: false, message: "Only project managers can add team members." });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ status: false, message: "User not found." });
  }

  if (pm.team.map(id => id.toString()).includes(user._id.toString())) {
    return res.status(400).json({ status: false, message: "User already in team." });
  }

  pm.team.push(user._id);
  await pm.save();

  // Emit event team-updated cho user được thêm
  const io = req.app.get("io");
  if (io) {
    io.to(`user-${user._id}`).emit("team-updated", { userId: user._id });
  }

  res.status(200).json({ status: true, message: "User added to team successfully.", user });
});

// Xóa user khỏi team của PM
const removeUserFromTeam = asyncHandler(async (req, res) => {
  const { userId } = req.user; // PM đang đăng nhập
  const { userIdToRemove } = req.body;

  const pm = await User.findById(userId);
  if (!pm || !pm.isProjectManager) {
    return res.status(403).json({ status: false, message: "Only project managers can remove team members." });
  }

  const idx = pm.team.map(id => id.toString()).indexOf(userIdToRemove);
  if (idx === -1) {
    return res.status(404).json({ status: false, message: "User not in team." });
  }

  pm.team.splice(idx, 1);
  await pm.save();

  // Emit event team-updated cho user bị xóa
  const io = req.app.get("io");
  if (io) {
    io.to(`user-${userIdToRemove}`).emit("team-updated", { userId: userIdToRemove });
  }

  res.status(200).json({ status: true, message: "User removed from team successfully." });
});

// Tìm kiếm user toàn hệ thống theo tên hoặc email (gần đúng)
const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === "") {
    return res.status(400).json({ status: false, message: "Missing search query" });
  }
  // Chỉ cho phép PM hoặc Admin
  if (!(req.user && (req.user.isAdmin || req.user.isProjectManager))) {
    return res.status(403).json({ status: false, message: "Not authorized" });
  }
  // Chỉ trả về project_manager hoặc member
  const users = await User.find({
    $and: [
      { role: { $in: ["project_manager", "member"] } },
      {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } }
        ]
      }
    ]
  }).select("name email role");
  res.status(200).json(users);
});

export {
  activateUserProfile,
  changeUserPassword,
  createAdminUser,
  deleteUserProfile,
  getNotificationsList,
  getTeamList,
  getUserTaskStatus,
  loginUser,
  logoutUser,
  markNotificationRead,
  registerUser,
  updateUserProfile,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadNotificationCount,
  addUserByAdmin,
  addUserToTeam,
  removeUserFromTeam,
  getPMTeamList,
  searchUsers,
};
