import express from "express";
import {
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
} from "../controllers/userController.js";
import { isAdminRoute, protectRoute, isProjectManagerRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/create-admin", protectRoute, isAdminRoute, createAdminUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

router.get("/get-team", protectRoute, isAdminRoute, getTeamList);
router.get("/notifications", protectRoute, getNotificationsList);
router.get("/get-status", protectRoute, getUserTaskStatus);

// New notification routes
router.get("/notifications/new", protectRoute, getNotifications);
router.get("/notifications/unread-count", protectRoute, getUnreadNotificationCount);
router.put("/notifications/:notificationId/read", protectRoute, markNotificationAsRead);
router.put("/notifications/read-all", protectRoute, markAllNotificationsAsRead);
router.delete("/notifications/:notificationId", protectRoute, deleteNotification);
router.delete("/notifications", protectRoute, deleteAllNotifications);

router.put("/profile", protectRoute, updateUserProfile);
router.put("/read-noti", protectRoute, markNotificationRead);
router.put("/change-password", protectRoute, changeUserPassword);
//   FOR ADMIN ONLY - ADMIN ROUTES
router
  .route("/:id")
  .put(protectRoute, isAdminRoute, activateUserProfile)
  .delete(protectRoute, isAdminRoute, deleteUserProfile);

router.post("/add-user", protectRoute, isAdminRoute, addUserByAdmin);
router.post("/team/add", protectRoute, addUserToTeam);
router.post("/team/remove", protectRoute, removeUserFromTeam);

// Route cho project manager lấy team của mình
router.get("/pm-team", protectRoute, getPMTeamList);

// Route tìm kiếm user toàn hệ thống cho PM/Admin
router.get("/search", protectRoute, isProjectManagerRoute, searchUsers);

export default router;
