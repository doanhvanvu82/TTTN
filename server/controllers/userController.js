import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import createJWT from "../utils/index.js";

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

// DELETE - delete user account
const deleteUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await User.findByIdAndDelete(id);

  res.status(200).json({ status: true, message: "User deleted successfully" });
});

export {
  createAdminUser,
  deleteUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
};
