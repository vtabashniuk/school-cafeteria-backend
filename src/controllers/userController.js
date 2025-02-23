import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Створення користувача (куратор або адміністратор створює)
export const createUser = async (req, res) => {
  try {
    const { login, password, role, lastName, firstName, group, createdBy } =
      req.body;
    const existingUser = await User.findOne({ login });

    if (existingUser)
      return res.status(400).json({ message: "Користувач вже існує" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      login,
      password: hashedPassword,
      role,
      lastName,
      firstName,
      group,
      createdBy,
    });
    await newUser.save();

    res.status(201).json({ message: "Користувач створений", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Отримання списку користувачів (тільки адміністратори та куратори)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Редагування користувача (Адмін для всіх куратори для учнів)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, balance, password, login, ...updates } = req.body; // Виключаємо зміну пароля та балансу
    const userId = req.user.id;
    const userRole = req.user.role;

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({ message: "Користувача не знайдено" });
    }

    // Перевірка прав доступу
    if (
      userRole !== "admin" &&
      (userRole !== "curator" || userToUpdate.createdBy?.toString() !== userId)
    ) {
      return res.status(403).json({
        message: "Недостатньо прав для редагування цього користувача",
      });
    }

    // Адмін не може міняти роль користувача через цей запит
    if ("role" in req.body) {
      return res.status(403).json({ message: "Зміна ролі заборонена" });
    }

    // Перевіряємо логін тільки якщо він змінився
    if (login && login !== userToUpdate.login) {
      const existingUser = await User.findOne({ login });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Користувач з таким логіном вже існує" });
      }
      userToUpdate.login = login;
    }

    Object.assign(userToUpdate, updates);
    await userToUpdate.save();
    res.json({ message: "Дані користувача оновлено", user: userToUpdate });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const user = await User.findById(id);
    if (!user)
      return res.status(404).json({ message: "Користувача не знайдено" });

    // Якщо змінює пароль не власник - перевірка прав
    if (
      userId !== id &&
      userRole !== "admin" &&
      (userRole !== "curator" || user.createdBy?.toString() !== userId)
    ) {
      return res
        .status(403)
        .json({ message: "Недостатньо прав для зміни пароля" });
    }

    // Якщо користувач сам змінює пароль, потрібно перевірити старий пароль
    if (userId === id) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Невірний старий пароль" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: "Пароль успішно змінено" });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

export const updateBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { balance } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const user = await User.findById(id);
    if (!user)
      return res.status(404).json({ message: "Користувача не знайдено" });

    // Учень може змінювати лише свій баланс
    if (userRole === "student" && userId !== id) {
      return res.status(403).json({
        message: "Недостатньо прав для зміни балансу іншого користувача",
      });
    }

    // Оновлення балансу
    user.balance = balance;
    await user.save();

    res.json({ message: "Баланс оновлено", balance: user.balance });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

export const setPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const user = await User.findById(id);
    if (!user)
      return res.status(404).json({ message: "Користувача не знайдено" });

    // Перевірка прав доступу
    if (
      userRole !== "admin" &&
      (userRole !== "curator" || user.createdBy?.toString() !== userId)
    ) {
      return res.status(403).json({
        message: "Недостатньо прав для зміни пароля цього користувача",
      });
    }

    // Хешування нового пароля
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: "Пароль успішно встановлено" });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Видалення користувача (тільки адміністратор або куратор може видаляти учнів)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: "Користувач видалений" });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};
