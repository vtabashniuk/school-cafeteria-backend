import Order from "../models/Order.js";
import User from "../models/User.js";
import Menu from "../models/Menu.js";

export const createOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const studentId = req.user.id;

    // Отримуємо ID страв та їх кількість
    const itemIds = items.map((item) => item.dishId);
    const menuItems = await Menu.find({ _id: { $in: itemIds } });

    if (menuItems.length !== items.length) {
      return res.status(400).json({ message: "Деякі страви не знайдено" });
    }

    // Формуємо замовлення та розраховуємо загальну вартість
    let total = 0;
    const orderItems = items
      .map((item) => {
        const dish = menuItems.find((d) => d._id.toString() === item.dishId);
        if (!dish) return null;

        const quantity = item.quantity || 1;
        total += dish.price * quantity;

        return {
          dishId: dish._id,
          dishName: dish.dishName,
          price: dish.price,
          quantity,
        };
      })
      .filter(Boolean);

    // Отримуємо користувача
    const student = await User.findById(studentId);
    if (!student)
      return res.status(404).json({ message: "Користувача не знайдено" });

    // Перевірка балансу
    if (student.balance - total < -200) {
      return res.status(400).json({ message: "Недостатньо коштів" });
    }

    // Віднімаємо кошти
    student.balance -= total;
    await student.save();

    // Створюємо замовлення
    const order = new Order({
      studentId,
      items: orderItems,
      total,
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Отримання всіх замовлень (куратор)
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate("studentId", "firstName lastName");
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Помилка сервера" });
    }
};

// Отримання замовлень конкретного учня (учень)
export const getStudentOrders = async (req, res) => {
    try {
        const orders = await Order.find({ studentId: req.user.id });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Помилка сервера" });
    }
};
