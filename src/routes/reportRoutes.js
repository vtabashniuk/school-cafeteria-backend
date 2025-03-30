import express from "express";
import { getOrdersByGroupAndDate } from "../controllers/reportController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/group", protect, checkRole(["curator"]), getOrdersByGroupAndDate);

export default router;
