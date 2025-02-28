import express from "express";
import {
  createUser,
  getUsers,
  updateBalance,
  updateUser,
  deleteUser,
  setPassword,
} from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  checkAdminOrCurator,
  checkCuratorOrStudent,
} from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", checkAdminOrCurator, createUser);
router.get("/", checkAdminOrCurator, getUsers);
router.put("/:id", checkAdminOrCurator, updateUser);
router.put("/:id/updatebalance", checkCuratorOrStudent, updateBalance);
router.put("/:id/setpassword", checkAdminOrCurator, setPassword);
router.delete("/:id", checkAdminOrCurator, deleteUser);

export default router;
