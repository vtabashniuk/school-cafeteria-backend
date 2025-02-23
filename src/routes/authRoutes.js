import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post("/register", protect, checkRole(["admin"]), register); // Тільки адміністратор може створювати користувачів
router.post("/login", login);
router.get("/me", protect, getMe);

export default router;
