const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["farmer", "customer", "delivery"],
      default: "customer"
    },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
