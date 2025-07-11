import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Menu from "../models/Menu.js";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, isBeneficiaryOrder } = req.body;
    const studentId = req.user.id;

    const student = await User.findById(studentId).session(session);
    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Користувача не знайдено" });
    }

    // Перевірка замовлень за сьогодні
    const todayStart = dayjs().tz("Europe/Kyiv").startOf("day").toDate();
    const todayEnd = dayjs().tz("Europe/Kyiv").endOf("day").toDate();

    const todayOrders = await Order.find({
      studentId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    }).session(session);

    const hasBeneficiaryOrder = todayOrders.some(
      (order) => order.isBeneficiaryOrder
    );
    const hasRegularOrder = todayOrders.some(
      (order) => !order.isBeneficiaryOrder
    );

    // Логіка для пільгового замовлення
    if (isBeneficiaryOrder) {
      if (!student.isBeneficiaries) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          message: "Тільки пільговики можуть створювати пільгові замовлення",
        });
      }
      if (hasBeneficiaryOrder) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Пільгове замовлення на сьогодні вже створено" });
      }

      const order = new Order({
        studentId,
        items: [],
        total: 0,
        isBeneficiaryOrder: true,
      });
      await order.save({ session });
      await session.commitTransaction();
      session.endSession();
      return res.status(201).json(order);
    }

    // Логіка для звичайного замовлення
    if (hasRegularOrder) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Звичайне замовлення на сьогодні вже створено" });
    }

    // Перевірка страв
    const itemIds = items.map((item) => item.dishId);
    const menuItems = await Menu.find({ _id: { $in: itemIds } }).session(
      session
    );

    if (menuItems.length !== items.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Деякі страви не знайдено" });
    }

    // Перевірка для пільговиків: лише isFreeSale: true
    if (student.isBeneficiaries) {
      const hasNonFreeSaleItems = items.some((item) => {
        const dish = menuItems.find((d) => d._id.toString() === item.dishId);
        return dish && !dish.isFreeSale;
      });

      if (hasNonFreeSaleItems) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: "Пільговики можуть замовляти лише страви з вільного продажу",
        });
      }
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

    if (orderItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Не вибрано жодної страви" });
    }

    // Перевірка балансу
    if (student.balance - total < -200) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Недостатньо коштів" });
    }

    // Оновлення балансу та історії
    const newBalance = student.balance - total;
    await User.updateBalanceHistory(
      studentId,
      {
        amount: -total,
        newBalance,
        changedBy: student._id,
        reason: `Замовлення - ${dayjs()
          .tz("Europe/Kyiv")
          .format("DD.MM.YYYY")}`,
        date: dayjs().tz("Europe/Kyiv").toDate(),
      },
      { session }
    );
    await User.updateOne(
      { _id: studentId },
      { $set: { balance: newBalance } },
      { session }
    );

    // Створюємо замовлення
    const order = new Order({
      studentId,
      items: orderItems,
      total,
      isBeneficiaryOrder: false,
    });

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(201).json(order);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const orderId = req.params.id;
    const studentId = req.user.id;

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Замовлення не знайдено" });
    }

    if (order.studentId.toString() !== studentId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json({ message: "Немає доступу до видалення цього замовлення" });
    }

    // Повернення коштів на баланс користувача, якщо це звичайне замовлення
    if (!order.isBeneficiaryOrder) {
      const student = await User.findById(order.studentId).session(session);
      const newBalance = student.balance + order.total;
      await User.updateBalanceHistory(
        studentId,
        {
          amount: order.total,
          newBalance,
          changedBy: student._id,
          reason: `Відмова від замовлення - ${dayjs()
            .tz("Europe/Kyiv")
            .format("DD.MM.YYYY")}`,
          date: dayjs().tz("Europe/Kyiv").toDate(),
        },
        { session }
      );
      await User.updateOne(
        { _id: studentId },
        { $set: { balance: newBalance } },
        { session }
      );
    }

    await order.deleteOne({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Замовлення видалено успішно" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

export const updateOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const orderId = req.params.id;
    const { items } = req.body;
    const studentId = req.user.id;

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Замовлення не знайдено" });
    }

    if (order.studentId.toString() !== studentId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json({ message: "Немає доступу до редагування цього замовлення" });
    }

    if (order.isBeneficiaryOrder) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Пільгове замовлення не можна редагувати" });
    }

    // Фільтруємо лише ті страви, у яких кількість > 0
    const filteredItems = items.filter((item) => item.quantity > 0);

    if (filteredItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Замовлення не може бути порожнім" });
    }

    const itemIds = filteredItems.map((item) => item.dishId);
    const menuItems = await Menu.find({ _id: { $in: itemIds } }).session(
      session
    );

    if (menuItems.length !== filteredItems.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Деякі страви не знайдено" });
    }

    // Перевірка для пільговиків: лише isFreeSale: true
    const student = await User.findById(studentId).session(session);
    if (student.isBeneficiaries) {
      const hasNonFreeSaleItems = filteredItems.some((item) => {
        const dish = menuItems.find((d) => d._id.toString() === item.dishId);
        return dish && !dish.isFreeSale;
      });

      if (hasNonFreeSaleItems) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: "Пільговики можуть замовляти лише страви з вільного продажу",
        });
      }
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

    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Користувача не знайдено" });
    }

    const refund = order.total;
    const newBalance = student.balance + refund - newTotal;

    if (newBalance < -200) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Недостатньо коштів для оновлення замовлення" });
    }

    // Оновлення балансу та історії
    await User.updateBalanceHistory(
      studentId,
      {
        amount: order.total - newTotal,
        newBalance,
        changedBy: student._id,
        reason: `Редагування замовлення - ${dayjs()
          .tz("Europe/Kyiv")
          .format("DD.MM.YYYY")}`,
        date: dayjs().tz("Europe/Kyiv").toDate(),
      },
      { session }
    );
    await User.updateOne(
      { _id: studentId },
      { $set: { balance: newBalance } },
      { session }
    );

    order.items = updatedItems;
    order.total = newTotal;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.json(order);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Помилка сервера", error: error.message });
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

    const todayStart = dayjs().tz("Europe/Kyiv").startOf("day").toDate();
    const todayEnd = dayjs().tz("Europe/Kyiv").endOf("day").toDate();

    console.log("todayStart:", todayStart.toISOString());
    console.log("todayEnd:  ", todayEnd.toISOString());

    const orders = await Order.find({
      studentId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    res.json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Помилка сервера при отриманні замовлень за сьогодні" });
  }
};
