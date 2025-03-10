import Menu from "../models/Menu.js";

// // Додавання страви в меню (тільки куратори)
// export const createDish = async (req, res) => {
//   try {
//     const { date, dishName, price } = req.body;
//     const newDish = new Menu({ date, dishName, price });
//     await newDish.save();

//     res.status(201).json({ message: "Страва додана до меню!", item: newDish });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Помилка при додаванні страви!", error: error.message });
//   }
// };

export const createDish = async (req, res) => {
  try {
    const dishes = req.body; // Масив страв
    const newDishes = [];

    // Перебираємо масив страв і додаємо кожну страву в базу
    for (let i = 0; i < dishes.length; i++) {
      const { date, dishName, price } = dishes[i];
      const newDish = new Menu({ date, dishName, price });
      await newDish.save(); // Зберігаємо страву в базу
      newDishes.push(newDish); // Додаємо нову страву до масиву для відповіді
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

    // Оновлення страви
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
