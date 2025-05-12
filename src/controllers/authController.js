import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const generateToken = (id, role, groups) => {
  return jwt.sign({ id, role, groups: groups || [] }, process.env.JWT_SECRET, {
    expiresIn: "12h",
  });
};

// Реєстрація користувача
export const register = async (req, res) => {
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
      createdBy,
      isBeneficiaries,
      isActive,
    } = req.body;

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
      balance: balance || 0, // Додаємо значення за замовчуванням
      group,
      groups: groups || [], // Додаємо порожній масив, якщо groups не передано
      createdBy,
      isBeneficiaries: isBeneficiaries || false,
      isActive: isActive || true,
    });

    await newUser.save();
    res.status(201).json({ message: "Користувач створений" });
  } catch (error) {
    console.error("register error:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Логін користувача
export const login = async (req, res) => {
  try {
    const { login, password } = req.body;
    const user = await User.findOne({ login });

    if (!user)
      return res.status(400).json({ message: "Користувач не знайдений" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Невірний пароль" });

    const token = generateToken(user._id, user.role, user.groups);

    res.json({
      token,
      user: {
        id: user._id,
        login: user.login,
        role: user.role,
        lastName: user.lastName,
        firstName: user.firstName,
        balance: user.balance,
        group: user.group,
        groups: user.groups,
        isBeneficiaries: user.isBeneficiaries,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Отримання інформації про поточного користувача
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user)
      return res.status(404).json({ message: "Користувач не знайдений" });

    res.json(user);
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
