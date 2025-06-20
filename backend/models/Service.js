const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer: String,
  serviceType: String,
  status: { type: String, enum: ["Pending", "In Progress", "Completed"] },
  cost: Number,
  dateStarted: Date,
  dateCompleted: Date
});

module.exports = mongoose.model("Service", serviceSchema);
