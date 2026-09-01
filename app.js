require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const connectDB = require("./config/db");
const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "farm2home-development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 }
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect("/login");
    if (!roles.includes(req.session.user.role)) return res.status(403).send("Access denied");
    next();
  };
}

function safeText(value) {
  return String(value || "").trim();
}

/* Home */
app.get("/", async (req, res) => {
  try {
    const products = await Product.find({ active: true, quantityAvailable: { $gt: 0 } })
      .populate("farmer", "name")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    res.render("home", { products });
  } catch (error) {
    console.error(error);
    res.render("home", { products: [] });
  }
});

/* Auth */
app.get("/register", (req, res) => res.render("register", { error: null }));

app.post("/register", async (req, res) => {
  try {
    const name = safeText(req.body.name);
    const email = safeText(req.body.email).toLowerCase();
    const password = safeText(req.body.password);
    const role = safeText(req.body.role);
    const phone = safeText(req.body.phone);
    const address = safeText(req.body.address);

    if (!name || !email || !password || !["farmer", "customer", "delivery"].includes(role)) {
      return res.render("register", { error: "Please fill all required fields correctly." });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.render("register", { error: "Email is already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword, role, phone, address });

    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.render("register", { error: "Registration failed. Please try again." });
  }
});

app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", async (req, res) => {
  try {
    const email = safeText(req.body.email).toLowerCase();
    const password = safeText(req.body.password);
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render("login", { error: "Invalid email or password." });
    }

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address
    };

    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.render("login", { error: "Login failed. Please try again." });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

/* Dashboard */
app.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const role = req.session.user.role;

    if (role === "farmer") {
      const products = await Product.find({ farmer: req.session.user.id }).sort({ createdAt: -1 }).lean();
      const orders = await Order.find({ "items.farmer": req.session.user.id })
        .populate("customer", "name email phone")
        .sort({ createdAt: -1 })
        .lean();
      return res.render("farmer-dashboard", { products, orders });
    }

    if (role === "delivery") {
      const orders = await Order.find({
        status: "Out for Delivery",
        $or: [{ deliveryPerson: req.session.user.id }, { deliveryPerson: null }]
      })
        .populate("customer", "name phone")
        .sort({ createdAt: -1 })
        .lean();
      return res.render("delivery-dashboard", { orders });
    }

    const search = safeText(req.query.search);
    const filter = { active: true, quantityAvailable: { $gt: 0 } };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }

    const products = await Product.find(filter).populate("farmer", "name").sort({ createdAt: -1 }).lean();
    const orders = await Order.find({ customer: req.session.user.id }).sort({ createdAt: -1 }).lean();

    res.render("customer-dashboard", { products, orders, search });
  } catch (error) {
    console.error(error);
    res.status(500).send("Dashboard loading error");
  }
});

/* Farmer product management */
app.get("/products/new", requireRole("farmer"), (req, res) => {
  res.render("product-form", { error: null });
});

app.post("/products", requireRole("farmer"), async (req, res) => {
  try {
    const product = new Product({
      name: safeText(req.body.name),
      category: safeText(req.body.category),
      price: Number(req.body.price),
      unit: safeText(req.body.unit) || "kg",
      quantityAvailable: Number(req.body.quantityAvailable),
      description: safeText(req.body.description),
      imageUrl: safeText(req.body.imageUrl),
      farmer: req.session.user.id
    });

    if (!product.name || !product.category || !Number.isFinite(product.price) ||
        product.price < 0 || !Number.isFinite(product.quantityAvailable) ||
        product.quantityAvailable < 0 || !product.description) {
      return res.render("product-form", { error: "Enter valid product details." });
    }

    await product.save();
    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.render("product-form", { error: "Could not add product." });
  }
});

app.post("/products/:id/toggle", requireRole("farmer"), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, farmer: req.session.user.id });
    if (!product) return res.status(404).send("Product not found");
    product.active = !product.active;
    await product.save();
    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).send("Could not update product");
  }
});

/* Customer order creation */
app.post("/orders", requireRole("customer"), async (req, res) => {
  try {
    const productId = safeText(req.body.productId);
    const quantity = Number(req.body.quantity);
    const deliveryAddress = safeText(req.body.deliveryAddress);
    const phone = safeText(req.body.phone);

    if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1 ||
        !deliveryAddress || !phone) {
      return res.status(400).send("Please enter valid order details.");
    }

    const product = await Product.findOne({ _id: productId, active: true });
    if (!product) return res.status(404).send("Product not found.");
    if (product.quantityAvailable < quantity) return res.status(400).send("Requested quantity is not available.");

    const subtotal = product.price * quantity;

    const order = await Order.create({
      customer: req.session.user.id,
      items: [{
        product: product._id,
        productName: product.name,
        farmer: product.farmer,
        quantity,
        unit: product.unit,
        price: product.price,
        subtotal
      }],
      totalAmount: subtotal,
      deliveryAddress,
      phone
    });

    product.quantityAvailable -= quantity;
    await product.save();

    res.redirect(`/orders/${order._id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Order creation failed.");
  }
});

app.get("/orders/:id", requireLogin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate("deliveryPerson", "name phone")
      .lean();

    if (!order) return res.status(404).send("Order not found.");

    const userId = req.session.user.id;
    const isCustomer = order.customer && order.customer._id.toString() === userId;
    const isDelivery = req.session.user.role === "delivery";
    const isFarmer = req.session.user.role === "farmer" &&
      order.items.some(item => item.farmer.toString() === userId);

    if (!isCustomer && !isDelivery && !isFarmer) return res.status(403).send("Access denied");

    res.render("order-details", { order });
  } catch (error) {
    console.error(error);
    res.status(500).send("Could not load order.");
  }
});

/* Farmer confirms/packs order. */
app.post("/orders/:id/status", requireRole("farmer"), async (req, res) => {
  try {
    const allowed = ["Confirmed", "Packed", "Out for Delivery"];
    const status = safeText(req.body.status);
    if (!allowed.includes(status)) return res.status(400).send("Invalid status.");

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send("Order not found.");

    const ownsItem = order.items.some(item => item.farmer.toString() === req.session.user.id);
    if (!ownsItem) return res.status(403).send("Access denied");

    order.status = status;
    if (status === "Out for Delivery") order.deliveryPerson = null;
    await order.save();

    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).send("Could not update order.");
  }
});

/* Delivery person claims and delivers an order. */
app.post("/orders/:id/delivery", requireRole("delivery"), async (req, res) => {
  try {
    const action = safeText(req.body.action);
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send("Order not found.");

    if (action === "claim") {
      if (order.status !== "Out for Delivery") return res.status(400).send("Order is not ready for delivery.");
      if (order.deliveryPerson && order.deliveryPerson.toString() !== req.session.user.id) {
        return res.status(409).send("Another delivery person has claimed this order.");
      }
      order.deliveryPerson = req.session.user.id;
      await order.save();
    } else if (action === "delivered") {
      if (!order.deliveryPerson || order.deliveryPerson.toString() !== req.session.user.id) {
        return res.status(403).send("Claim the order before marking it delivered.");
      }
      order.status = "Delivered";
      await order.save();
    } else {
      return res.status(400).send("Invalid delivery action.");
    }

    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).send("Could not update delivery.");
  }
});

/* Customer cancellation before packing. */
app.post("/orders/:id/cancel", requireRole("customer"), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.session.user.id });
    if (!order) return res.status(404).send("Order not found.");
    if (!["Pending", "Confirmed"].includes(order.status)) {
      return res.status(400).send("This order can no longer be cancelled.");
    }

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantityAvailable: item.quantity } });
    }

    order.status = "Cancelled";
    await order.save();
    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).send("Could not cancel order.");
  }
});

/* Health endpoint for Docker/monitoring */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.use((req, res) => res.status(404).send("404 Page Not Found"));

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚜 Farm2Home running on http://localhost:${PORT}`);
    });
  } catch (error) {
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
