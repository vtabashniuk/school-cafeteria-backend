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
          isFreeSale: dish.isFreeSale,
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

export const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log("Order ID from params: ", orderId);

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Замовлення не знайдено" });
    }

    // Використовуємо deleteOne() для видалення
    await order.deleteOne(); // або await Order.findByIdAndDelete(orderId);

    // Повернення коштів на баланс користувача
    const student = await User.findById(order.studentId);
    student.balance += order.total;
    await student.save();

    res.status(200).json({ message: "Замовлення видалено успішно" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Щось пішло не так при видаленні замовлення" });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { items } = req.body;
    const studentId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Замовлення не знайдено" });
    }

    if (order.studentId.toString() !== studentId) {
      return res
        .status(403)
        .json({ message: "Немає доступу до редагування цього замовлення" });
    }

    // 🧹 Фільтруємо лише ті страви, у яких кількість > 0
    const filteredItems = items.filter((item) => item.quantity > 0);

    // Якщо після фільтрації нічого не лишилось — відмовляємось від оновлення
    if (filteredItems.length === 0) {
      return res
        .status(400)
        .json({ message: "Замовлення не може бути порожнім" });
    }

    const itemIds = filteredItems.map((item) => item.dishId);
    const menuItems = await Menu.find({ _id: { $in: itemIds } });

    if (menuItems.length !== filteredItems.length) {
      return res.status(400).json({ message: "Деякі страви не знайдено" });
    }

    let newTotal = 0;
    const updatedItems = filteredItems.map((item) => {
      const dish = menuItems.find((d) => d._id.toString() === item.dishId);
      const quantity = item.quantity || 1;
      newTotal += dish.price * quantity;
      return {
        dishId: dish._id,
        dishName: dish.dishName,
        price: dish.price,
        quantity,
        isFreeSale: dish.isFreeSale,
      };
    });

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Користувача не знайдено" });
    }

    const refund = order.total;
    const newBalance = student.balance + refund - newTotal;

    if (newBalance < -200) {
      return res
        .status(400)
        .json({ message: "Недостатньо коштів для оновлення замовлення" });
    }

    student.balance = newBalance;
    await student.save();

    order.items = updatedItems;
    order.total = newTotal;
    await order.save();

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Отримання всіх замовлень (куратор)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate(
      "studentId",
      "firstName lastName"
    );
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

// Отримання замовлення конкретного учня (учень) за поточну дату
export const getTodayStudentOrders = async (req, res) => {
  try {
    const studentId = req.user.id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      studentId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Помилка сервера при отриманні замовлень за сьогодні" });
  }
};
