import mongoose from "mongoose";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { hashPassword } from "../utils/hashPassword.js";

// Створення користувача (куратор або адміністратор створює)
export const createUser = async (req, res) => {
  try {
    const {
      login,
      password,
      role,
      lastName,
      firstName,
      group,
      groups,
      balance,
      isBeneficiaries,
    } = req.body;

    const existingUser = await User.findOne({ login });

    if (existingUser)
      return res.status(400).json({ message: "Користувач вже існує" });

    const hashedPassword = await hashPassword(password);

    // Витягнення ID поточного користувача, який створює нового
    const createdBy = req.user.id; // Поточний користувач із JWT токена

    if (role === "curator" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Тільки адміністратор може створити куратора" });
    }

    const newUser = new User({
      login,
      password: hashedPassword,
      role,
      lastName,
      firstName,
      balance,
      group,
      groups: role === "curator" ? [...(groups || [])].sort() : [], // для куратора вибір кількох груп
      createdBy, // Додаємо createdBy до нового користувача
      isBeneficiaries, // Додаємо признак пільговика
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
    if (req.user.role === "student") {
      return res.status(403).json({ message: "Недостатньо прав" });
    }

    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Редагування користувача (Адмін для всіх, куратори для учнів із відповідною групою)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, password, login, ...updates } = req.body; // Виключаємо зміну пароля
    const userId = req.user.id;
    const userRole = req.user.role;
    const curatorGroups = req.user.groups || []; // Групи куратора з JWT токена

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({ message: "Користувача не знайдено" });
    }

    // Перевірка прав доступу
    if (userRole !== "admin") {
      if (
        userRole !== "curator" ||
        userToUpdate.role !== "student" ||
        !curatorGroups.includes(userToUpdate.group)
      ) {
        return res.status(403).json({
          message: "Недостатньо прав для редагування цього користувача",
        });
      }
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

    // Сортуємо groups за алфавітом для куратора
    if (userToUpdate.role === "curator" && updates.groups) {
      updates.groups = [...(updates.groups || [])].sort();
    }

    Object.assign(userToUpdate, updates);
    await userToUpdate.save();
    res.json({ message: "Дані користувача оновлено", user: userToUpdate });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Зміна пароля
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const curatorGroups = req.user.groups || []; // Групи куратора

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Всі поля мають бути заповнені" });
    }

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "Користувача не знайдено" });

    // Якщо змінює пароль не власник - перевірка прав
    if (userId !== user._id.toString()) {
      if (
        userRole !== "admin" &&
        (userRole !== "curator" ||
          user.role !== "student" ||
          !curatorGroups.includes(user.group))
      ) {
        return res
          .status(403)
          .json({ message: "Недостатньо прав для зміни пароля" });
      }
    }

    // Якщо користувач сам змінює пароль, потрібно перевірити старий пароль
    if (userId === user._id.toString()) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Невірний старий пароль" });
    }

    user.password = await hashPassword(newPassword);
    await user.save();
    res.json({ message: "Пароль успішно змінено" });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Оновлення балансу
export const updateBalance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { newBalance, reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const curatorGroups = req.user.groups || [];

    // Валідація вхідних даних
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Некоректний ID користувача" });
    }

    if (typeof newBalance !== "number" || isNaN(newBalance)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "newBalance має бути числом" });
    }

    if (reason && typeof reason !== "string") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "reason має бути рядком" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Некоректний ID ініціатора" });
    }

    const user = await User.findById(id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Користувача не знайдено" });
    }

    // Перевірка прав доступу
    if (userRole === "student" && userId !== id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        message: "Недостатньо прав для зміни балансу іншого користувача",
      });
    }
    if (
      userRole === "curator" &&
      (user.role !== "student" || !curatorGroups.includes(user.group))
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        message: "Недостатньо прав для зміни балансу цього користувача",
      });
    }

    // Перевірка ліміту балансу
    if (newBalance < -200) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Баланс не може бути менше -200" });
    }

    // Обчислення різниці
    const delta = newBalance - user.balance;

    // Оновлення історії балансу
    await User.updateBalanceHistory(
      id,
      {
        amount: delta,
        newBalance,
        changedBy: userId,
        reason: reason || "Зміна балансу",
        date: new Date(),
      },
      { session }
    );

    // Оновлення балансу
    await User.updateOne(
      { _id: id },
      { $set: { balance: newBalance } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    res.json({ message: "Баланс оновлено" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

// Встановлення пароля
export const setPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const curatorGroups = req.user.groups || []; // Групи куратора

    const user = await User.findById(id);
    if (!user)
      return res.status(404).json({ message: "Користувача не знайдено" });

    // Перевірка прав доступу
    if (userRole !== "admin") {
      if (
        userRole !== "curator" ||
        user.role !== "student" ||
        !curatorGroups.includes(user.group)
      ) {
        return res.status(403).json({
          message: "Недостатньо прав для зміни пароля цього користувача",
        });
      }
    }

    // Хешування нового пароля
    user.password = await hashPassword(newPassword);
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

// Отримання історії зміни балансу
export const getBalanceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const user = await User.findById(id).populate(
      "balanceHistory.changedBy",
      "lastName firstName role"
    );

    if (!user)
      return res.status(404).json({ message: "Користувача не знайдено" });

    if (
      currentUser.role !== "admin" &&
      currentUser.role !== "curator" &&
      currentUser.id !== id
    ) {
      return res.status(403).json({ message: "Недостатньо прав" });
    }

    res.json(user.balanceHistory);
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};
