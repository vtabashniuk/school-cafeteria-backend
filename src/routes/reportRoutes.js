import express from "express";
import {
  getTodayOrdersReportByGroup,
  getPeriodOrdersReportByGroup,
  getTodayOrdersReportForCafeteriaByGroup,
  getPeriodOrdersReportForCafeteriaByGroup,
  getBalanceHistoryReportByGroup,
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
  "/period-report-by-group",
  protect,
  checkRole(["curator"]),
  getPeriodOrdersReportByGroup
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
router.get(
  "/balance-history-report-by-group",
  protect,
  checkRole(["curator"]),
  getBalanceHistoryReportByGroup
);

export default router;
