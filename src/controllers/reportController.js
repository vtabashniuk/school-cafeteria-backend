import Order from "../models/Order.js";
import User from "../models/User.js";
import Menu from "../models/Menu.js";

const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export const getTodayOrdersReportByGroup = async (req, res) => {
  const { group } = req.query;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const students = await User.find({ group, role: "student" });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "Студентів цієї групи не знайдено" });
    }

    const orders = await Order.find({
      studentId: { $in: students.map((student) => student._id) },
      date: { $gte: today, $lt: tomorrow },
    })
      .populate("studentId", "firstName lastName group")
      .populate("items.dishId", "dishName")
      .exec();

    const result = orders.map((order) => {
      const student = order.studentId;
      const dishes = order.items.map((item) => item.dishName).join("; ");
      return {
        lastName: student.lastName,
        firstName: student.firstName,
        group: student.group,
        date: formatDate(order.date), // Використовуємо формат DD.MM.YYYY
        total: order.total,
        dishes,
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

export const getTodayOrdersReportForCafeteriaByGroup = async (req, res) => {
  const { group } = req.query;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const students = await User.find({ group, role: "student" });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "Студентів цієї групи не знайдено" });
    }

    const orders = await Order.find({
      studentId: { $in: students.map((student) => student._id) },
      date: { $gte: today, $lt: tomorrow },
    })
      .populate("items.dishId", "dishName price isFreeSale")
      .exec();

    let totalBeneficiaryOrders = 0;
    let freeSaleDishes = {};
    let paidDishes = {};
    let totalSum = 0;

    orders.forEach((order) => {
      totalSum += order.total;

      if (order.isBeneficiaryOrder) {
        totalBeneficiaryOrders++;
      }

      order.items.forEach((item) => {
        const dish = item.dishId.dishName;
        const price = item.price;
        const quantity = item.quantity;
        const totalDishPrice = price * quantity;

        const targetDishSummary = item.isFreeSale ? freeSaleDishes : paidDishes;

        if (targetDishSummary[dish]) {
          targetDishSummary[dish].quantity += quantity;
          targetDishSummary[dish].totalPrice += totalDishPrice;
        } else {
          targetDishSummary[dish] = {
            price,
            quantity,
            totalPrice: totalDishPrice,
          };
        }
      });
    });

    const report = {
      date: formatDate(today), // Використовуємо формат DD.MM.YYYY
      beneficiaryOrders: totalBeneficiaryOrders,
      freeSaleDishes: Object.keys(freeSaleDishes).map((dishName) => ({
        dishName,
        price: freeSaleDishes[dishName].price,
        quantity: freeSaleDishes[dishName].quantity,
        totalPrice: freeSaleDishes[dishName].totalPrice,
      })),
      paidDishes: Object.keys(paidDishes).map((dishName) => ({
        dishName,
        price: paidDishes[dishName].price,
        quantity: paidDishes[dishName].quantity,
        totalPrice: paidDishes[dishName].totalPrice,
      })),
      total: totalSum,
    };

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

export const getPeriodOrdersReportForCafeteriaByGroup = async (req, res) => {
  const { group, fromDate, toDate } = req.query;

  if (!group || !fromDate || !toDate) {
    return res
      .status(400)
      .json({ message: "Необхідно вказати групу та діапазон дат" });
  }

  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  if (isNaN(startDate) || isNaN(endDate)) {
    return res.status(400).json({ message: "Неправильний формат дати" });
  }

  try {
    const students = await User.find({ group, role: "student" });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "Студентів цієї групи не знайдено" });
    }

    const orders = await Order.find({
      studentId: { $in: students.map((student) => student._id) },
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("items.dishId", "dishName price isFreeSale")
      .exec();

    let totalBeneficiaryOrders = 0;
    let freeSaleDishes = {};
    let paidDishes = {};
    let totalSum = 0;

    orders.forEach((order) => {
      totalSum += order.total;

      if (order.isBeneficiaryOrder) {
        totalBeneficiaryOrders++;
      }

      order.items.forEach((item) => {
        const dish = item.dishId.dishName;
        const price = item.price;
        const quantity = item.quantity;
        const totalDishPrice = price * quantity;

        const targetDishSummary = item.isFreeSale ? freeSaleDishes : paidDishes;

        if (targetDishSummary[dish]) {
          targetDishSummary[dish].quantity += quantity;
          targetDishSummary[dish].totalPrice += totalDishPrice;
        } else {
          targetDishSummary[dish] = {
            price,
            quantity,
            totalPrice: totalDishPrice,
          };
        }
      });
    });

    const report = {
      dateRange: [formatDate(startDate), formatDate(endDate)], // Використовуємо формат DD.MM.YYYY
      beneficiaryOrders: totalBeneficiaryOrders,
      freeSaleDishes: Object.keys(freeSaleDishes).map((dishName) => ({
        dishName,
        price: freeSaleDishes[dishName].price,
        quantity: freeSaleDishes[dishName].quantity,
        totalPrice: freeSaleDishes[dishName].totalPrice,
      })),
      paidDishes: Object.keys(paidDishes).map((dishName) => ({
        dishName,
        price: paidDishes[dishName].price,
        quantity: paidDishes[dishName].quantity,
        totalPrice: paidDishes[dishName].totalPrice,
      })),
      total: totalSum,
    };

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};