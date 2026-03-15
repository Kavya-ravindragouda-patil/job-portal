// routes/jobs.js

const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const Application = require("../models/Application");


/* =========================
   DASHBOARD
========================= */

router.get("/dashboard", async (req, res) => {

  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {

    let jobs;

    // EMPLOYER DASHBOARD
    if (req.session.role === "employer") {

      jobs = await Job.find({
        postedBy: req.session.userId
      }).lean();

      // attach applicants
      for (let job of jobs) {

        const applications = await Application.find({
          jobId: job._id
        })
        .populate("userId", "name email")
        .lean();

        job.applications = applications;

      }

    }

    // JOB SEEKER DASHBOARD
    else {

      jobs = await Job.find().lean();

    }

    res.render("dashboard", {
      user: req.session.userName,
      role: req.session.role,
      jobs
    });

  } catch (error) {

    console.error(error);
    res.status(500).send("Server Error");

  }

});


/* =========================
   JOB LIST PAGE
========================= */

router.get("/jobs", async (req, res) => {

  try {

    const jobs = await Job.find().lean();

    res.render("jobs", { jobs });

  } catch (error) {

    console.error(error);
    res.status(500).send("Server Error");

  }

});


/* =========================
   POST JOB PAGE
========================= */

router.get("/post-jobs", (req, res) => {

  if (!req.session.userId || req.session.role !== "employer") {
    return res.redirect("/login");
  }

  res.render("post-jobs");

});


/* =========================
   SAVE JOB
========================= */

router.post("/post-jobs", async (req, res) => {

  if (!req.session.userId || req.session.role !== "employer") {
    return res.redirect("/login");
  }

  try {

    const { title, company, location, description } = req.body;

    const job = new Job({

      title,
      company,
      location,
      description,
      postedBy: req.session.userId

    });

    await job.save();

    res.redirect("/dashboard");

  } catch (error) {

    console.error(error);
    res.status(500).send("Server Error");

  }

});


module.exports = router;