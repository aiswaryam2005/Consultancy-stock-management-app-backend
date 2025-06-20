const mongoose = require("mongoose");

const profitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true, unique: true }, // store as ISO Date
  services: Number,
  partsSold: Number,
  serviceRevenue: Number,
  partsRevenue: Number,
  partsCost: Number,
  profit: Number
});

module.exports = mongoose.model("Profit", profitSchema);