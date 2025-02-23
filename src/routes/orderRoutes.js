import express from "express";
import {
  createOrder,
  getAllOrders,
  getStudentOrders,
} from "../controllers/orderController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, checkRole(["student"]), createOrder);
router.get("/", protect, checkRole(["curator"]), getAllOrders);
router.get("/my", protect, checkRole(["student"]), getStudentOrders);

export default router;
