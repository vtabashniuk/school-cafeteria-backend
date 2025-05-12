import express from "express";
import {
  createUser,
  getUsers,
  getBalanceHistory,
  updateBalance,
  updateUser,
  deleteUser,
  setPassword,
  changePassword,
} from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  checkAdminOrCurator,
  checkCuratorOrStudent,
  checkAllUsers,
} from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", checkAdminOrCurator, createUser);
router.get("/", checkAdminOrCurator, getUsers);
router.put("/changepassword", checkAllUsers, changePassword);
router.put("/:id", checkAdminOrCurator, updateUser);
router.get("/:id/balance-history", checkAllUsers, getBalanceHistory);
router.put("/:id/setpassword", checkAdminOrCurator, setPassword);
router.put("/:id/updatebalance", checkCuratorOrStudent, updateBalance);
router.delete("/:id", checkAdminOrCurator, deleteUser);

export default router;
