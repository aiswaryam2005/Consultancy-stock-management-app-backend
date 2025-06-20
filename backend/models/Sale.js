const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now }, // Add date field
});

module.exports = mongoose.model("Sale", saleSchema);
