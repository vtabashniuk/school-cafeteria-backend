import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  dishName: { type: String, required: true },
  price: { type: Number, required: true },
  isFreeSale: { type: Boolean, default: false },
});

const Menu = mongoose.model("Menu", menuSchema);
export default Menu;
