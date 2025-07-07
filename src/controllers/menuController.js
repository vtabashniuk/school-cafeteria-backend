import Menu from "../models/Menu.js";

// 🔧 Утиліта для нормалізації дати до UTC 00:00
const normalizeDateToUTC = (inputDate) => {
  const date = new Date(inputDate);
  date.setUTCHours(0, 0, 0, 0);
  return date;
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
    const now = new Date();
    const startOfDayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const endOfDayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));

    const todayMenu = await Menu.find({
      date: { $gte: startOfDayUTC, $lt: endOfDayUTC },
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

    // Якщо оновлюється дата — нормалізуємо
    if (updates.date) {
      updates.date = normalizeDateToUTC(updates.date);
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
    await Menu.findByIdAndDelete(id);
    res.json({ message: "Страву видалено" });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};
