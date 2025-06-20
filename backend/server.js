const express = require("express");//ok
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Signup Route
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ message: "User created", token });
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login Route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// routes/stats.js or in your main file (make sure `authenticateToken` is used)
app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const products = await Product.find({ userId });

    const totalProducts = products.length;
    const lowStock = products.filter(p => p.stock < p.reorderPoint && p.stock > 0).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const inventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    res.json({
      totalProducts,
      lowStock,
      outOfStock,
      inventoryValue,
    });
  } catch (err) {
    console.error("Error calculating stats:", err);
    res.status(500).json({ error: "Failed to calculate stats" });
  }
});


const Product = require("./models/Product");

// Get all products for a user
app.get("/api/products", authenticateToken, async (req, res) => {
  if (!req.user) return res.json([]);
  const products = await Product.find({ userId: req.user.id });
  res.json(products);
});

// Add a product
app.post("/api/products", authenticateToken, async (req, res) => {
   if (!req.user) return res.json([]);
  const product = await Product.create({ ...req.body, userId: req.user.id });
  res.json(product);
});

// Update product
app.put("/api/products/:id", authenticateToken, async (req, res) => {
  if (!req.user) return res.json([]);
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(product);
});

// Get single product by ID
app.get("/api/products/:id", authenticateToken, async (req, res) => {
  try {
     if (!req.user) return res.json([]);
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.user.id, // Ensure user owns the product
    });

    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete product
app.delete("/api/products/:id", authenticateToken, async (req, res) => {
   if (!req.user) return res.json([]);
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Product deleted" });
});

const Service = require("./models/Service");

// Get all services for logged-in user
app.get("/api/services", authenticateToken, async (req, res) => {
  if (!req.user) return res.json([]);
  const services = await Service.find({ userId: req.user.id });
  res.json(services);
});

// Create new service
app.post("/api/services", authenticateToken, async (req, res) => {
  if (!req.user) return res.json([]);
  const newService = new Service({ ...req.body, userId: req.user.id });
  await newService.save();
  res.status(201).json(newService);
});

// Update existing service
app.put("/api/services/:id", authenticateToken, async (req, res) => {
  if (!req.user) return res.json([]);
  const updated = await Service.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    req.body,
    { new: true }
  );
  res.json(updated);
});

// Delete service
app.delete("/api/services/:id", authenticateToken, async (req, res) => {
  if (!req.user) return res.json([]);
  await Service.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  res.json({ message: "Service deleted" });
});

const Dealer = require("./models/Dealer");

// Get all dealers
app.get("/api/dealers", authenticateToken, async (req, res) => {
   if (!req.user) return res.json([]);
  const dealers = await Dealer.find({ userId: req.user.id });
  res.json(dealers);
});

// Update dealer
app.put("/api/dealers/:id", authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.json([]);
    const dealer = await Dealer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });
    res.json(dealer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update dealer" });
  }
});

// Add a new dealer
app.post("/api/dealers", authenticateToken, async (req, res) => {
   if (!req.user) return res.json([]);
  const dealer = new Dealer({ ...req.body, userId: req.user.id });
  await dealer.save();
  res.json(dealer);
});

// Delete a dealer
app.delete("/api/dealers/:id", authenticateToken, async (req, res) => {
   if (!req.user) return res.json([]);
  await Dealer.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

// Add order to a dealer
app.post("/api/dealers/:id/orders", authenticateToken, async (req, res) => {
   if (!req.user) return res.json([]);
  const dealer = await Dealer.findById(req.params.id);
  dealer.orders.push(req.body);
  await dealer.save();
  res.json(dealer);
});

// Update an order by dealer ID and order ID
app.put("/api/dealers/:dealerId/orders/:orderId", authenticateToken, async (req, res) => {
  try {
     if (!req.user) return res.json([]);
    const { dealerId, orderId } = req.params;
    const updateData = req.body;

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });

    // Find the order inside dealer.orders by orderId
    const order = dealer.orders.id(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Update order fields
    Object.assign(order, updateData);

    await dealer.save();

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// Delete an order by dealer ID and order ID
app.delete("/api/dealers/:dealerId/orders/:orderId", authenticateToken, async (req, res) => {
  try {
     if (!req.user) return res.json([]);
    const dealer = await Dealer.findById(req.params.dealerId);
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });

    // Remove order from dealer.orders array
    dealer.orders = dealer.orders.filter(order => order._id.toString() !== req.params.orderId);
    await dealer.save();

    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// Get dealer's orders
app.get("/api/dealers/:id/orders", authenticateToken, async (req, res) => {
   if (!req.user) return res.json([]);
  const dealer = await Dealer.findById(req.params.id);
  res.json(dealer.orders);
});

const Sale = require("./models/Sale");

// Create
app.post("/api/sales", authenticateToken, async (req, res) => {
  try {
     if (!req.user) return res.json([]);
    const sale = new Sale({ ...req.body, userId: req.user.id });
    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Read
app.get("/api/sales", authenticateToken, async (req, res) => {
   if (!req.user) return res.json([]);
  const sales = await Sale.find({ userId: req.user.id });
  res.json(sales);
});

// Update
app.put("/api/sales/:id", authenticateToken, async (req, res) => {
  try {
     if (!req.user) return res.json([]);
    const updated = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete
app.delete("/api/sales/:id", authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.json([]);
    await Sale.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const Profit = require("./models/Profit");

// POST /api/profit — save/update profit for a specific day (user-specific)
app.post("/api/profit", authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const { date, services, partsSold, serviceRevenue, partsRevenue, partsCost } = req.body;
  const profit = serviceRevenue + partsRevenue - partsCost;

  // Normalize date to midnight
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  try {
    const updated = await Profit.findOneAndUpdate(
      { date: normalizedDate, userId: req.user.id }, // filter by userId & date!
      {
        date: normalizedDate,
        services,
        partsSold,
        serviceRevenue,
        partsRevenue,
        partsCost,
        profit,
        userId: req.user.id,  // ensure userId is saved too
      },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (err) {
    console.error("Failed to save profit data:", err);
    res.status(500).json({ error: "Failed to save profit data" });
  }
});

// GET /api/profit — get all profit records for logged-in user, sorted by date DESC
app.get("/api/profit", authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const profits = await Profit.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(profits);
  } catch (err) {
    console.error("Failed to fetch profit data:", err);
    res.status(500).json({ error: "Failed to fetch profit data" });
  }
});

// POST /api/generate-today — auto-generate today's profit summary for logged-in user
app.post("/api/generate-today", authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    // Services Completed Today for user
    const services = await Service.find({
      status: "Completed",
      dateCompleted: { $gte: start, $lte: end },
      userId: req.user.id,
    });
    const serviceRevenue = services.reduce((sum, s) => sum + (s.cost || 0), 0);

    // Sales Today for user
    const sales = await Sale.find({
      date: { $gte: start, $lte: end },
      userId: req.user.id,
    });
    const partsRevenue = sales.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
    const partsSold = sales.reduce((sum, s) => sum + s.quantity, 0);

    // Dealer Orders Completed Today for user
    const dealers = await Dealer.find({ userId: req.user.id }); // Assuming dealers are user-specific
    const todayOrders = dealers.flatMap((dealer) =>
      (dealer.orders || []).filter(
        (order) =>
          order.status === "Completed" &&
          order.date >= start &&
          order.date <= end
      )
    );
    const partsCost = todayOrders.reduce((sum, o) => sum + o.quantity * o.unitPrice, 0);

    const profit = serviceRevenue + partsRevenue - partsCost;

    // Normalize today's date
    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);

    // Find existing profit for today and user
    let existing = await Profit.findOne({ date: todayDateOnly, userId: req.user.id });
    if (existing) {
      existing.services = services.length;
      existing.partsSold = partsSold;
      existing.serviceRevenue = serviceRevenue;
      existing.partsRevenue = partsRevenue;
      existing.partsCost = partsCost;
      existing.profit = profit;
      await existing.save();
    } else {
      await Profit.create({
        date: todayDateOnly,
        services: services.length,
        partsSold,
        serviceRevenue,
        partsRevenue,
        partsCost,
        profit,
        userId: req.user.id,
      });
    }

    res.status(200).json({ message: "Profit summary generated" });
  } catch (err) {
    console.error("Profit generation error:", err);
    res.status(500).json({ message: "Error generating profit summary" });
  }
});



app.put('/dealers/:dealerId/orders/:orderId', authenticateToken, async (req, res) => {
  try {
     if (!req.user) return res.json([]);
    const { dealerId, orderId } = req.params;
    const { status, product, quantity, unitPrice, date } = req.body;

    const existingOrder = await Order.findById(orderId);
    const prevStatus = existingOrder.status;

    existingOrder.product = product;
    existingOrder.quantity = quantity;
    existingOrder.unitPrice = unitPrice;
    existingOrder.status = status;
    existingOrder.date = date;

    await existingOrder.save();

    // Stock adjustment ONLY if status is changed to Completed
    if (prevStatus !== "Completed" && status === "Completed") {
      const foundProduct = await Product.findOne({ name: product });
      if (foundProduct) {
        foundProduct.stock += parseInt(quantity);
        await foundProduct.save();
      }
    }

    res.json(existingOrder);
  } catch (err) {
    res.status(500).json({ error: "Update failed", details: err.message });
  }
});

app.post('/sales', authenticateToken, async (req, res) => {
  try {
     if (!req.user) return res.json([]);
    const { productName, quantity, unitPrice, date } = req.body;

    const sale = new Sale({ productName, quantity, unitPrice, date, userId: req.user.id });
    await sale.save();

    // Reduce stock
    const foundProduct = await Product.findOne({ name: productName });
    if (foundProduct) {
      foundProduct.stock -= parseInt(quantity);
      await foundProduct.save();
    }

    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: "Sale creation failed", details: err.message });
  }
});

app.put('/sales/:id', authenticateToken, async (req, res) => {
  try {
     if (!req.user) return res.json([]);
    const { id } = req.params;
    const { productName, quantity, unitPrice, date } = req.body;

    const existingSale = await Sale.findById(id);
    if (!existingSale) return res.status(404).json({ error: "Sale not found" });

    // Revert previous stock change
    const oldProduct = await Product.findOne({ name: existingSale.productName });
    if (oldProduct) {
      oldProduct.stock += existingSale.quantity;
      await oldProduct.save();
    }

    // Update sale
    existingSale.productName = productName;
    existingSale.quantity = quantity;
    existingSale.unitPrice = unitPrice;
    existingSale.date = date;
    await existingSale.save();

    // Apply new stock change
    const newProduct = await Product.findOne({ name: productName });
    if (newProduct) {
      newProduct.stock -= quantity;
      await newProduct.save();
    }

    res.json(existingSale);
  } catch (err) {
    res.status(500).json({ error: "Sale update failed", details: err.message });
  }
});

app.delete('/sales/:id', authenticateToken, async (req, res) => {
  try {
     if (!req.user) return res.json([]);
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (sale) {
      const product = await Product.findOne({ name: sale.productName });
      if (product) {
        product.stock += sale.quantity;
        await product.save();
      }
    }
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete sale", details: err.message });
  }
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
