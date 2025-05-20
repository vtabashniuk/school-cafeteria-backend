import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    login: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "curator", "student"],
      required: true,
    },
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    group: { type: String },
    groups: [{ type: String }],
    balance: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    isBeneficiaries: { type: Boolean, default: false },
    balanceHistory: [
      {
        amount: { type: Number },
        newBalance: { type: Number },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: { type: String },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Додаємо індекс на balanceHistory.date для прискорення запитів
userSchema.index({ "balanceHistory.date": 1 });

// Метод для додавання запису до balanceHistory з обмеженням 5 років
userSchema.statics.updateBalanceHistory = async function (
  userId,
  newEntry,
  options = {}
) {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  // Виконуємо $pull для видалення старих записів
  await this.updateOne(
    { _id: userId },
    { $pull: { balanceHistory: { date: { $lt: fiveYearsAgo } } } },
    options
  );

  // Виконуємо $push для додавання нового запису
  await this.updateOne(
    { _id: userId },
    { $push: { balanceHistory: newEntry } },
    options
  );
};

const User = mongoose.model("User", userSchema);
export default User;
