import Menu from "../models/Menu.js";

// Додавання страви в меню (тільки куратори)
export const createDish = async (req, res) => {
  try {
    const { date, dishName, price } = req.body;
    const newDish = new Menu({ date, dishName, price });
    await newDish.save();

    res.status(201).json({ message: "Страва додана до меню!", item: newDish });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка при додаванні страви!", error: error.message });
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

// Оновлення страви (тільки куратори)
export const updateDish = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedDish = await Menu.findByIdAndUpdate(id, updates, {
      new: true,
    });
      res.json({ message: "Страву оновлено", item: updatedDish });
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
