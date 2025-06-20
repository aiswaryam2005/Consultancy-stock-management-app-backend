// models/Dealer.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  product: String,
  quantity: Number,
  unitPrice: Number,
  status: { type: String, enum: ["Pending", "Completed"] },
  date: { type: Date, default: Date.now }
});

const dealerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  contactName: String,
  phone: String,
  email: String,
  address: String,
  products: [String],
  orders: [orderSchema]
});

module.exports = mongoose.model("Dealer", dealerSchema);
