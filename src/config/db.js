import { connect } from "mongoose";

const connectDB = async () => {
  try {
    await connect(process.env.MONGO_URI);
    console.log("✅ MongoDB підключено...");
  } catch (error) {
    console.error("❌ Помилка підключення до MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;
