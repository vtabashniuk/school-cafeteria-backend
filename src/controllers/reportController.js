import Order from "../models/Order.js";
import User from "../models/User.js";

const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// Звіт по сьогоднішнім замовленням для групи
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
        date: formatDate(order.date),
        total: order.total,
        dishes,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Помилка в getTodayOrdersReportByGroup:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

// Звіт по замовленням за період для групи
export const getPeriodOrdersReportByGroup = async (req, res) => {
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
      .populate("studentId", "firstName lastName group")
      .populate("items.dishId", "dishName")
      .exec();

    const ordersByDate = {};
    orders.forEach((order) => {
      const dateKey = formatDate(order.date);
      if (!ordersByDate[dateKey]) {
        ordersByDate[dateKey] = [];
      }
      const student = order.studentId;
      const dishes = order.items.map((item) => item.dishName).join("; ");
      ordersByDate[dateKey].push({
        lastName: student.lastName,
        firstName: student.firstName,
        group: student.group,
        date: dateKey,
        total: order.total,
        dishes,
      });
    });

    res.json({
      dateRange: [formatDate(startDate), formatDate(endDate)],
      ordersByDate,
    });
  } catch (error) {
    console.error("Помилка в getPeriodOrdersReportByGroup:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

// Звіт по сьогоднішнім замовленням для їдальні за групою
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
      date: formatDate(today),
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
    console.error("Помилка в getTodayOrdersReportForCafeteriaByGroup:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

// Звіт по замовленням за період для їдальні за групою
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
        if (!item.dishId) {
          console.warn("Замовлення містить item без dishId:", item);
          return; // пропускаємо цей item
        }

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
      dateRange: [formatDate(startDate), formatDate(endDate)],
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
    console.error("Помилка в getPeriodOrdersReportForCafeteriaByGroup:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

// Звіт по історії балансу за групою
export const getBalanceHistoryReportByGroup = async (req, res) => {
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
    const students = await User.find({ group, role: "student" }).populate(
      "balanceHistory.changedBy",
      "firstName lastName"
    );

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "Студентів цієї групи не знайдено" });
    }

    const balanceHistoryByDate = {};
    students.forEach((student) => {
      student.balanceHistory.forEach((entry) => {
        if (entry.date >= startDate && entry.date <= endDate) {
          const dateKey = formatDate(entry.date);
          if (!balanceHistoryByDate[dateKey]) {
            balanceHistoryByDate[dateKey] = [];
          }
          balanceHistoryByDate[dateKey].push({
            lastName: student.lastName,
            firstName: student.firstName,
            amount: entry.amount,
            newBalance: entry.newBalance,
            changedBy: entry.changedBy
              ? `${entry.changedBy.firstName} ${entry.changedBy.lastName}`
              : "Невідомо",
            reason: entry.reason || "Без причини",
            date: dateKey,
          });
        }
      });
    });

    res.json({
      dateRange: [formatDate(startDate), formatDate(endDate)],
      balanceHistoryByDate,
    });
  } catch (error) {
    console.error("Помилка в getBalanceHistoryReportByGroup:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

// Звіт по залишку котів по групі
export const getGroupBalanceSnapshot = async (req, res) => {
  try {
    const { group } = req.query;

    if (!group) {
      return res.status(400).json({ message: "Необхідно вказати групу" });
    }

    // Знаходимо активних студентів цієї групи
    const students = await User.find({
      role: "student",
      group,
      isActive: true,
    })
      .select("firstName lastName balance")
      .lean();

    // Сортування за прізвищем
    students.sort((a, b) => a.lastName.localeCompare(b.lastName, "uk"));

    const total = students.reduce((sum, s) => sum + s.balance, 0);

    res.json({
      report: students,
      total,
    });
  } catch (error) {
    console.error("Помилка при формуванні звіту по залишках:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

//Звіт про боржників по групі
export const getDebtorsReport = async (req, res) => {
  try {
    const { group } = req.query;

    if (!group) {
      return res.status(400).json({ message: "Необхідно вказати групу" });
    }

    // Знаходимо студентів цієї групи з негативним балансом
    const debtors = await User.find({
      role: "student",
      group,
      isActive: true,
      balance: { $lt: 0 },
    })
      .select("firstName lastName balance")
      .lean();

    // Сортування за прізвищем
    debtors.sort((a, b) => a.lastName.localeCompare(b.lastName, "uk"));

    const totalDebt = debtors.reduce((sum, s) => sum + s.balance, 0);

    res.json({
      report: debtors,
      totalDebt,
    });
  } catch (error) {
    console.error("Помилка при формуванні звіту по боржникам:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Звіт по сьогоднішньому замовленню студента
export const getStudentTodayOrderReport = async (req, res) => {
  try {
    const studentId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await Order.find({
      studentId,
      date: { $gte: today, $lt: tomorrow },
    })
      .populate("items.dishId", "dishName price isFreeSale")
      .lean();

    const result = orders.map((order) => ({
      orderId: order._id,
      date: formatDate(order.date),
      total: order.total,
      isBeneficiaryOrder: order.isBeneficiaryOrder,
      dishes: order.items.map((item) => ({
        dishName: item.dishId.dishName,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
        isFreeSale: item.isFreeSale,
      })),
    }));

    res.json(result);
  } catch (error) {
    console.error("Помилка в getStudentTodayOrderReport:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

// Звіт по замовленням студента за період
export const getStudentPeriodOrdersReport = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { fromDate, toDate, page = 1, limit = 10 } = req.query;

    // Валідація дат
    const startDate = fromDate ? new Date(fromDate) : new Date(0);
    const endDate = toDate ? new Date(toDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: "Неправильний формат дати" });
    }

    if (startDate > endDate) {
      return res
        .status(400)
        .json({ message: "fromDate не може бути пізніше toDate" });
    }

    // Пагінація
    const skip = (page - 1) * limit;
    const orders = await Order.find({
      studentId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("items.dishId", "dishName price isFreeSale")
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalOrders = await Order.countDocuments({
      studentId,
      date: { $gte: startDate, $lte: endDate },
    });

    const result = orders.map((order) => ({
      orderId: order._id,
      date: formatDate(order.date),
      total: order.total,
      isBeneficiaryOrder: order.isBeneficiaryOrder,
      dishes: order.items.map((item) => ({
        dishName: item.dishId.dishName,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
        isFreeSale: item.isFreeSale,
      })),
    }));

    res.json({
      report: result,
      dateRange: [formatDate(startDate), formatDate(endDate)],
      totalOrders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
    });
  } catch (error) {
    console.error("Помилка в getStudentOrdersReport:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

export const getStudentPeriodAllOrdersReport = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { fromDate, toDate } = req.query;

    // Валідація дат
    const startDate = fromDate ? new Date(fromDate) : new Date(0);
    const endDate = toDate ? new Date(toDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: "Неправильний формат дати" });
    }
    if (startDate > endDate) {
      return res
        .status(400)
        .json({ message: "fromDate не може бути пізніше toDate" });
    }

    // Отримуємо всі замовлення без пагінації
    const orders = await Order.find({
      studentId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("items.dishId", "dishName price isFreeSale")
      .sort({ date: 1 })
      .lean();

    const totalOrders = orders.length;
    const result = orders.map((order) => ({
      orderId: order._id,
      date: formatDate(order.date),
      total: order.total,
      isBeneficiaryOrder: order.isBeneficiaryOrder,
      dishes: order.items.map((item) => ({
        dishName: item.dishId.dishName,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
        isFreeSale: item.dishId.isFreeSale,
      })),
    }));

    res.json({
      report: result,
      dateRange: [formatDate(startDate), formatDate(endDate)],
      totalOrders,
      currentPage: 1,
      totalPages: 1,
    });
  } catch (error) {
    console.error("Помилка в getStudentAllPeriodOrdersReport:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

// Звіт по історії балансу студента
export const getStudentBalanceHistoryReport = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { fromDate, toDate, page = 1, limit = 10 } = req.query;

    // Валідація дат
    const startDate = fromDate ? new Date(fromDate) : new Date(0);
    const endDate = toDate ? new Date(toDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: "Неправильний формат дати" });
    }

    if (startDate > endDate) {
      return res
        .status(400)
        .json({ message: "fromDate не може бути пізніше toDate" });
    }

    // Отримання користувача
    const student = await User.findById(studentId)
      .populate("balanceHistory.changedBy", "firstName lastName role")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Студента не знайдено" });
    }

    // Фільтрація історії балансу
    let balanceHistory = student.balanceHistory || [];
    if (fromDate || toDate) {
      balanceHistory = balanceHistory.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    // Пагінація
    const totalEntries = balanceHistory.length;
    const skip = (page - 1) * limit;
    const paginatedHistory = balanceHistory.slice(skip, skip + parseInt(limit));

    const result = paginatedHistory.map((entry) => ({
      date: formatDate(entry.date),
      amount: entry.amount,
      newBalance: entry.newBalance,
      reason: entry.reason || "Без причини",
      changedBy: entry.changedBy
        ? `${entry.changedBy.firstName} ${entry.changedBy.lastName} (${entry.changedBy.role})`
        : "Невідомо",
    }));

    res.json({
      report: result,
      currentBalance: student.balance,
      dateRange: [formatDate(startDate), formatDate(endDate)],
      totalEntries,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalEntries / limit),
    });
  } catch (error) {
    console.error("Помилка в getStudentBalanceReport:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

// Звіт по всіх змінах балансу студента за період без пагінації
export const getStudentAllBalanceHistoryReport = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { fromDate, toDate } = req.query;

    // Валідація дат
    const startDate = fromDate ? new Date(fromDate) : new Date(0);
    const endDate = toDate ? new Date(toDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: "Неправильний формат дати" });
    }
    if (startDate > endDate) {
      return res
        .status(400)
        .json({ message: "fromDate не може бути пізніше toDate" });
    }

    // Отримання користувача
    const student = await User.findById(studentId)
      .populate("balanceHistory.changedBy", "firstName lastName role")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Студента не знайдено" });
    }

    // Фільтрація історії балансу
    let balanceHistory = student.balanceHistory || [];
    if (fromDate || toDate) {
      balanceHistory = balanceHistory.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    const result = balanceHistory.map((entry) => ({
      date: formatDate(entry.date),
      amount: entry.amount,
      newBalance: entry.newBalance,
      reason: entry.reason || "Без причини",
      changedBy: entry.changedBy
        ? `${entry.changedBy.firstName} ${entry.changedBy.lastName} (${entry.changedBy.role})`
        : "Невідомо",
    }));

    res.json({
      report: result,
      currentBalance: student.balance,
      dateRange: [formatDate(startDate), formatDate(endDate)],
      totalEntries: result.length,
      currentPage: 1,
      totalPages: 1,
    });
  } catch (error) {
    console.error("Помилка в getStudentAllBalanceHistoryReport:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};
