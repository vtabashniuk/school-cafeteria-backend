import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, default: Date.now },
    items: [
      {
        dishId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Menu",
          required: true,
        },
        dishName: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, default: 1, min: 1 },
        isFreeSale: { type: Boolean, required: true },
      },
    ],
    total: { type: Number, required: true },
    isBeneficiaryOrder: { type: Boolean, default: false },
  },
  {
    timestamps: true, // додає createdAt і updatedAt
  }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
