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
    balance: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    isBeneficiaries: {type: Boolean, default: false},
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
