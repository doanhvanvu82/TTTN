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
router.get("/get-team", protectRoute, isAdminRoute, getTeamList);
router.post("/add-user", protectRoute, isAdminRoute, addUserByAdmin);
router.post("/team/add", protectRoute, addUserToTeam);
router.post("/team/remove", protectRoute, removeUserFromTeam);

// Route cho project manager lấy team của mình
router.get("/pm-team", protectRoute, getPMTeamList);
//   FOR ADMIN ONLY - ADMIN ROUTES
router
  .route("/:id")
  .delete(protectRoute, isAdminRoute, deleteUserProfile);

export default router;
