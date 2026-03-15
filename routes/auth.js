// routes/auth.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");

/* =========================
   SHOW REGISTER PAGE
========================= */
router.get("/register", (req, res) => {
    res.render("register");
});

/* =========================
   HANDLE REGISTER FORM
========================= */
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate fields
        if (!name || !email || !password || !role) {
            return res.send("All fields are required.");
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send("Email is already registered.");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user
        const user = new User({ name, email, password: hashedPassword, role });
        await user.save();

        res.redirect("/login");
    } catch (err) {
        console.error(err);
        res.send("Error: " + err.message);
    }
});

/* =========================
   SHOW LOGIN PAGE
========================= */
router.get("/login", (req, res) => {
    res.render("login");
});

/* =========================
   HANDLE LOGIN FORM
========================= */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.send("Both email and password are required.");
        }

        const user = await User.findOne({ email });
        if (!user) return res.send("Invalid email or password.");

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.send("Invalid email or password.");

        // Store in session
        req.session.user = user;
        req.session.userId = user._id;
        req.session.userName = user.name;
        req.session.role = user.role;

        res.redirect("/dashboard");
    } catch (err) {
        console.error(err);
        res.send("Error: " + err.message);
    }
});

/* =========================
   HANDLE LOGOUT
========================= */
router.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        res.redirect("/login");
    });
});

module.exports = router;