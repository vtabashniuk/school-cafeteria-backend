import express from "express";
import {
  getTodayOrdersReportByGroup,
  getTodayOrdersReportForCafeteriaByGroup,
  getPeriodOrdersReportForCafeteriaByGroup,
} from "../controllers/reportController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get(
  "/today-report-by-group",
  protect,
  checkRole(["curator"]),
  getTodayOrdersReportByGroup
);
router.get(
  "/today-report-for-cafeteria",
  protect,
  checkRole(["curator"]),
  getTodayOrdersReportForCafeteriaByGroup
);
router.get(
  "/period-report-for-cafeteria",
  protect,
  checkRole(["curator"]),
  getPeriodOrdersReportForCafeteriaByGroup
);

export default router;
