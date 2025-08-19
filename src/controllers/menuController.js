import Order from "../models/Order.js";
import Menu from "../models/Menu.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// 🔧 Утиліта для нормалізації дати до UTC 00:00
const normalizeDateToUTC = (inputDate) => {
  return dayjs(inputDate).startOf("day").utc().toDate();
};

// Додавання страви в меню (тільки куратори)
export const createFreeSaleDish = async (req, res) => {
  try {
    const { date, dishName, price, isFreeSale } = req.body;

    const newDish = new Menu({
      date: normalizeDateToUTC(date),
      dishName,
      price,
      isFreeSale,
    });

    await newDish.save();

    res.status(201).json({ message: "Страва додана до меню!", item: newDish });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка при додаванні страви!", error: error.message });
  }
};

export const createDish = async (req, res) => {
  try {
    const dishes = req.body;
    const newDishes = [];

    for (let i = 0; i < dishes.length; i++) {
      const { date, dishName, price } = dishes[i];
      const newDish = new Menu({
        date: normalizeDateToUTC(date),
        dishName,
        price,
      });
      await newDish.save();
      newDishes.push(newDish);
    }

    res
      .status(201)
      .json({ message: "Страви додано до меню!", items: newDishes });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка при додаванні страв", error: error.message });
  }
};

// Отримання всього меню
export const getMenu = async (req, res) => {
  try {
    const menu = await Menu.find();
    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// ✅ Отримання меню для сьогоднішнього дня (по UTC)
export const getMenuForToday = async (req, res) => {
  try {
    // Локальний час у Києві
    const nowKyiv = dayjs().tz("Europe/Kyiv");
    const startOfDayKyiv = nowKyiv.startOf("day").toDate();
    const endOfDayKyiv = nowKyiv.endOf("day").toDate();

    const todayMenu = await Menu.find({
      date: { $gte: startOfDayKyiv, $lte: endOfDayKyiv },
    });

    res.status(200).json(todayMenu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Щось пішло не так!" });
  }
};

// Оновлення страви (тільки куратори)
export const updateDish = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userRole = req.user.role;

    const dishToUpdate = await Menu.findById(id);
    if (!dishToUpdate) {
      return res.status(404).json({ message: "Страву не знайдено" });
    }

    if (userRole !== "curator") {
      return res.status(403).json({
        message: "Недостатньо прав для редагування цієї страви",
      });
    }

    Object.assign(dishToUpdate, updates);
    await dishToUpdate.save();

    res.json({ message: "Страву оновлено", item: dishToUpdate });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Видалення страви (тільки куратори)
export const deleteDish = async (req, res) => {
  try {
    const { id } = req.params;    
    // Перевіряємо, чи ця страва є в замовленнях
    const dishInOrders = await Order.exists({ "items.dishId": id });
    if (dishInOrders) {
      return res.status(400).json({
        message: "Неможливо видалити — страва вже використовується у замовленнях",
      });
    }

    // Видалення страви
    await Menu.findByIdAndDelete(id);
    res.json({ message: "Страву видалено" });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};
