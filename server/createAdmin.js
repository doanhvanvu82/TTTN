import mongoose from "mongoose";
import User from "./models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ isAdmin: true });
    if (existingAdmin) {
      console.log("Admin user already exists!");
      console.log("Email:", existingAdmin.email);
      process.exit(0);
    }

    // Create admin user
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@admin.com",
      password: "admin123",
      title: "System Administrator",
      role: "admin",
      isAdmin: true,
      isActive: true,
    });

    console.log("Admin user created successfully!");
    console.log("Email: admin@admin.com");
    console.log("Password: admin123");
    console.log("Please change the password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
};

createAdminUser(); 