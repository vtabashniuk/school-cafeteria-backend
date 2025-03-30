import express from "express";
import {
  createDish,
  getMenu,
  getMenuForToday,
  updateDish,
  deleteDish,
} from "../controllers/menuController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, checkRole(["curator"]), createDish);
router.get("/", getMenu);
router.get("/today", getMenuForToday);
router.put("/:id", protect, checkRole(["curator"]), updateDish);
router.delete("/:id", protect, checkRole(["curator"]), deleteDish);

export default router;
