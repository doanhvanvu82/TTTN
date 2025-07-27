import express from "express";
import {
  createAdminUser,
  deleteUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
} from "../controllers/userController.js";
import { isAdminRoute, protectRoute, isProjectManagerRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/create-admin", protectRoute, isAdminRoute, createAdminUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

router.put("/profile", protectRoute, updateUserProfile);
//   FOR ADMIN ONLY - ADMIN ROUTES
router
  .route("/:id")
  .delete(protectRoute, isAdminRoute, deleteUserProfile);

export default router;
