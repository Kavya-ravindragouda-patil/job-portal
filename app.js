/* ======================================================
JOB PORTAL - MAIN SERVER FILE
====================================================== */

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcryptjs");

/* ===============================
IMPORT MODELS
================================ */
const Job = require("./models/Job");
const Application = require("./models/Application");
const User = require("./models/User");

/* ===============================
CREATE EXPRESS APP
================================ */
const app = express();

/* ======================================================
DATABASE CONNECTION
====================================================== */
mongoose.connect(
  "mongodb+srv://bharathiushettarshettar_db_user:Bharu2003@cluster0.3pmkbks.mongodb.net/jobportal?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB Atlas Connected Successfully"))
.catch(err => console.log("❌ Database Connection Error:", err));

/* ======================================================
MIDDLEWARE
====================================================== */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ======================================================
SESSION SETUP
====================================================== */
app.use(session({
  secret: "jobportal_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

/* ======================================================
VIEW ENGINE
====================================================== */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ======================================================
UPLOAD FOLDER SETUP
====================================================== */
const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
app.use("/uploads", express.static(uploadPath));

/* ======================================================
MULTER CONFIGURATION
====================================================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only PDF, DOC, DOCX files allowed"));
  }
});

/* ======================================================
HOME PAGE
====================================================== */
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.render("home");
});

/* ======================================================
REGISTER PAGE
====================================================== */
app.get("/register", (req, res) => res.render("register"));

app.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.send("⚠ Email already registered. Please login.");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();

    console.log("✅ User Registered");
    res.redirect("/login");
  } catch (err) {
    console.log(err);
    res.send("Registration Error");
  }
});

/* ======================================================
LOGIN PAGE
====================================================== */
app.get("/login", (req, res) => res.render("login"));

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.send("Invalid Login");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send("Invalid Login");

    req.session.user = user;
    req.session.role = user.role;
    console.log("✅ User Logged In");

    if (user.role === "employer") return res.redirect("/employer-dashboard");
    res.redirect("/dashboard");
  } catch (err) {
    console.log(err);
    res.send("Login Error");
  }
});

/* ======================================================
LOGOUT
====================================================== */
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

/* ======================================================
EMPLOYER DASHBOARD
====================================================== */
app.get("/employer-dashboard", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    if (req.session.role !== "employer") return res.send("Access denied");

    const jobs = await Job.find({ postedBy: req.session.user._id }).lean();
    const jobsWithApplications = await Promise.all(
      jobs.map(async (job) => {
        const applications = await Application.find({ jobId: job._id }).populate("userId");
        return { ...job, applications };
      })
    );

    res.render("employer-dashboard", { user: req.session.user, jobs: jobsWithApplications });
  } catch (err) {
    console.log(err);
    res.send("Error loading employer dashboard");
  }
});

/* ======================================================
POST JOB
====================================================== */
app.get("/post-job", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("post-job");
});

app.post("/post-job", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const { title, company, location, description } = req.body;
    const job = new Job({
      title,
      company,
      location,
      description,
      postedBy: req.session.user._id
    });
    await job.save();
    console.log("✅ Job Posted Successfully");
    res.redirect("/employer-dashboard");
  } catch (err) {
    console.log(err);
    res.send("Error posting job");
  }
});

/* ======================================================
JOB SEEKER DASHBOARD
====================================================== */
app.get("/dashboard", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const search = req.query.search;
    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { company: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } }
        ]
      };
    }

    const jobs = await Job.find(query);
    res.render("dashboard", {
      user: req.session.user,
      role: req.session.role,
      jobs
    });
  } catch (err) {
    console.log(err);
    res.send("Dashboard loading error");
  }
});

/* ======================================================
APPLY JOB PAGE
====================================================== */
app.get("/apply-job/:jobId", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const job = await Job.findById(req.params.jobId);
    if (!job) return res.send("Job not found");

    // ✅ Pass user object to EJS
    res.render("apply-job", { job, user: req.session.user });
  } catch (err) {
    console.log(err);
    res.send("Error loading job");
  }
});

/* ======================================================
SUBMIT JOB APPLICATION
====================================================== */
app.post("/apply-job/:jobId", upload.single("resume"), async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const { name, email, phone, coverLetter } = req.body;
    const jobId = req.params.jobId;

    // Check if user already applied
    const alreadyApplied = await Application.findOne({
      userId: req.session.user._id,
      jobId
    });
    if (alreadyApplied) return res.send("⚠ You already applied for this job.");

    if (!req.file) return res.send("⚠ Please upload your resume.");

    // Save the application to DB
    const application = new Application({
      userId: req.session.user._id,
      jobId,
      name,
      email,
      phone,
      coverLetter,
      resume: req.file.filename
    });
    await application.save();
    console.log("✅ Application Saved");

    res.redirect("/applications");
  } catch (err) {
    console.log(err);
    res.send("Application submission error");
  }
});

/* ======================================================
MY APPLICATIONS
====================================================== */
app.get("/applications", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const applications = await Application.find({ userId: req.session.user._id })
      .populate("jobId");
    res.render("applications", { applications });
  } catch (err) {
    console.log(err);
    res.send("Error loading applications");
  }
});

/* ======================================================
ERROR HANDLING
====================================================== */
app.use((req, res) => res.status(404).send("404 Page Not Found"));

/* ======================================================
START SERVER
====================================================== */
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));