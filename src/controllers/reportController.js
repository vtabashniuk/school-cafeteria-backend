import Order from "../models/Order.js";
import User from "../models/User.js";
import Menu from "../models/Menu.js";
// Отримання всіх замовлень за групою та поточною датою
export const getOrdersByGroupAndDate = async (req, res) => {
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
