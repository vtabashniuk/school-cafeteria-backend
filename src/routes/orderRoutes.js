import express from "express";
import {
  createOrder,
  deleteOrder,
  getUsedDishIds,
  getTodayStudentOrders,
  getStudentOrders,
  updateOrder,
} from "../controllers/orderController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkRole, checkAdminOrCurator } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, checkRole(["student"]), createOrder);
router.put("/:id", protect, checkRole(["student"]), updateOrder);
router.delete("/:id", protect, checkRole(["student"]), deleteOrder);
router.get("/my", protect, checkRole(["student"]), getStudentOrders);
router.get("/my/today", protect, checkRole(["student"]), getTodayStudentOrders);
router.get("/used-dishes", protect, checkAdminOrCurator, getUsedDishIds);

export default router;
