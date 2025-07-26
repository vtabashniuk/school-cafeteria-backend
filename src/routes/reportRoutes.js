import express from "express";
import {
  getTodayOrdersReportByGroup,
  getPeriodOrdersReportByGroup,
  getTodayOrdersReportForCafeteriaByGroup,
  getPeriodOrdersReportForCafeteriaByGroup,
  getBalanceHistoryReportByGroup,
  getDebtorsReport,
  getGroupBalanceSnapshot,
  getStudentTodayOrderReport,
  getStudentPeriodOrdersReport,
  getStudentPeriodAllOrdersReport,
  getStudentBalanceHistoryReport,
  getStudentAllBalanceHistoryReport,
} from "../controllers/reportController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get(
  "/curator/today-report-by-group",
  protect,
  checkRole(["curator"]),
  getTodayOrdersReportByGroup
);
router.get(
  "/curator/period-report-by-group",
  protect,
  checkRole(["curator"]),
  getPeriodOrdersReportByGroup
);
router.get(
  "/curator/today-report-for-cafeteria",
  protect,
  checkRole(["curator"]),
  getTodayOrdersReportForCafeteriaByGroup
);
router.get(
  "/curator/period-report-for-cafeteria",
  protect,
  checkRole(["curator"]),
  getPeriodOrdersReportForCafeteriaByGroup
);
router.get(
  "/curator/balance-history-report-by-group",
  protect,
  checkRole(["curator"]),
  getBalanceHistoryReportByGroup
);
router.get(
  "/curator/group-balance-snapshot",
  protect,
  checkRole(["curator"]),
  getGroupBalanceSnapshot
);
router.get(
  "/curator/debtors-report",
  protect,
  checkRole(["curator"]),
  getDebtorsReport
);
router.get(
  "/student/today-order-report",
  protect,
  checkRole(["student"]),
  getStudentTodayOrderReport
);
router.get(
  "/student/period-orders-report",
  protect,
  checkRole(["student"]),
  getStudentPeriodOrdersReport
);
router.get(
  "/student/period-all-orders-report",
  protect,
  checkRole(["student"]),
  getStudentPeriodAllOrdersReport
);
router.get(
  "/student/balance-history-report",
  protect,
  checkRole(["student"]),
  getStudentBalanceHistoryReport
);
router.get(
  "/student/all-balance-history-report",
  protect,
  checkRole(["student"]),
  getStudentAllBalanceHistoryReport
);

export default router;
