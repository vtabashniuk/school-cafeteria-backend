import dotenv from "dotenv";
import express, { json } from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(json());

// API маршрути
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/orders", orderRoutes);

// Підключення до MongoDB
connectDB();

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Сервер запущено на порту ${PORT}`));
