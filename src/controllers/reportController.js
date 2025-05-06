import Order from "../models/Order.js";
import User from "../models/User.js";
import Menu from "../models/Menu.js";
// Отримання всіх замовлень за групою та поточною датою
export const getTodayOrdersReportByGroup = async (req, res) => {
  const { group } = req.query; // отримуємо групу з запиту
  const today = new Date();
  today.setHours(0, 0, 0, 0); // встановлюємо початок поточного дня
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1); // встановлюємо наступний день

  try {
    // Знаходимо всіх студентів вказаної групи
    const students = await User.find({ group, role: "student" });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "Студентів цієї групи не знайдено" });
    }

    // Отримуємо всі замовлення для студентів цієї групи, зроблені в поточну дату
    const orders = await Order.find({
      studentId: { $in: students.map((student) => student._id) },
      date: { $gte: today, $lt: tomorrow },
    })
      .populate("studentId", "firstName lastName group") // заповнюємо дані студента
      .populate("items.dishId", "dishName") // заповнюємо дані страв
      .exec();

    // Формуємо результат для відповіді
    const result = orders.map((order) => {
      const student = order.studentId;
      const dishes = order.items.map((item) => item.dishName).join(", "); // перетворюємо список страв в рядок
      return {
        lastName: student.lastName,
        firstName: student.firstName,
        group: student.group,
        date: order.date.toISOString(),
        total: order.total,
        dishes,
      };
    });

    res.json(result); // Відправляємо результат
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

export const getTodayOrdersReportForCafeteriaByGroup = async (req, res) => {
  const { group } = req.query; // отримуємо групу з запиту
  const today = new Date();
  today.setHours(0, 0, 0, 0); // початок поточного дня
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1); // наступний день

  try {
    // Отримуємо всіх студентів вказаної групи
    const students = await User.find({ group, role: "student" });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "Студентів цієї групи не знайдено" });
    }

    // Отримуємо всі замовлення для студентів цієї групи, зроблені сьогодні
    const orders = await Order.find({
      studentId: { $in: students.map((student) => student._id) },
      date: { $gte: today, $lt: tomorrow },
    })
      .populate("items.dishId", "dishName price isFreeSale") // заповнюємо назви страв, ціни та isFreeSale
      .exec();

    let totalBeneficiaryOrders = 0;
    let freeSaleDishes = {}; // для страв, де isFreeSale = true
    let paidDishes = {}; // для страв, де isFreeSale = false
    let totalSum = 0; // загальна вартість всіх замовлень

    orders.forEach((order) => {
      // додаємо до загальної вартості замовлення
      totalSum += order.total;

      // перевіряємо, чи це пільгове замовлення
      if (order.isBeneficiaryOrder) {
        totalBeneficiaryOrders++;
      }

      // обробка кожної страви в замовленні
      order.items.forEach((item) => {
        const dish = item.dishId.dishName;
        const price = item.price;
        const quantity = item.quantity;
        const totalDishPrice = price * quantity;

        // перевіряємо, чи страва є пільговою
        const targetDishSummary = item.isFreeSale ? freeSaleDishes : paidDishes;

        // додаємо страву до відповідного об'єкта
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

    // формуємо результат
    const report = {
      date: today.toISOString(), // форматуємо дату
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

    res.json(report); // Відправляємо результат
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
