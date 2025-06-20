// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  stock: Number,
  location: String,
  supplier: String,
  reorderPoint: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 👈 link to user
});

module.exports = mongoose.model("Product", productSchema);
