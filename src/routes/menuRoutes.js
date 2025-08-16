import express from "express";
import {
  createFreeSaleDish,
  createDish,
  getMenu,
  getMenuForToday,
  updateDish,
  deleteDish,
} from "../controllers/menuController.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  checkAdminOrCurator,
} from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/", getMenu);
router.post("/", protect, checkAdminOrCurator, createDish);
router.post("/freesaledish", protect, checkAdminOrCurator, createFreeSaleDish);
router.get("/today", getMenuForToday);
router.put("/:id", protect, checkAdminOrCurator, updateDish);
router.delete("/:id", protect, checkAdminOrCurator, deleteDish);

export default router;
