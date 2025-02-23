import express from "express";
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  setPassword,
} from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, checkRole(["admin", "curator"]), createUser);
router.get("/", protect, checkRole(["admin", "curator"]), getUsers);
router.put("/:id", protect, checkRole(["admin", "curator"]), updateUser);
router.put("/:id/setpassword", protect, checkRole(["admin", "curator"]), setPassword);
router.delete("/:id", protect, checkRole(["admin", "curator"]), deleteUser);

export default router;
