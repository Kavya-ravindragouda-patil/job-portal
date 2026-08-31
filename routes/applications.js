// routes/applications.js

const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const Job = require("../models/Job");
const multer = require("multer");
const path = require("path");


/* =========================
MULTER STORAGE
========================= */

const storage = multer.diskStorage({

destination: function (req, file, cb) {
cb(null, "uploads/");
},

filename: function (req, file, cb) {
cb(null, Date.now() + "-" + file.originalname);
}

});


/* =========================
FILE FILTER
========================= */

const fileFilter = (req, file, cb) => {

const allowed = [".pdf", ".doc", ".docx"];
const ext = path.extname(file.originalname).toLowerCase();

if (allowed.includes(ext)) {
cb(null, true);
} else {
cb(new Error("Only PDF, DOC, DOCX files allowed"), false);
}

};


/* =========================
MULTER CONFIG
========================= */

const upload = multer({
storage: storage,
fileFilter: fileFilter,
limits: { fileSize: 5 * 1024 * 1024 }
});


/* =================================================
OPEN APPLICATION FORM (NEW ROUTE)
================================================= */

router.get("/apply/:jobId", async (req, res) => {

try {

if (!req.session.userId) {
return res.redirect("/login");
}

const job = await Job.findById(req.params.jobId);

if (!job) {
return res.send("Job not found");
}

res.render("apply-job", { job });

} catch (error) {

console.error(error);
res.status(500).send("Error loading application form");

}

});


/* =================================================
SUBMIT JOB APPLICATION
================================================= */

router.post("/apply/:jobId", upload.single("resume"), async (req, res) => {

try {

if (!req.session.userId) {
return res.redirect("/login");
}

if (req.session.role !== "jobseeker") {
return res.send("Only jobseekers can apply for jobs");
}

const jobId = req.params.jobId;

/* =========================
CHECK DUPLICATE APPLICATION
========================= */

const existing = await Application.findOne({
userId: req.session.userId,
jobId: jobId
});

if (existing) {
return res.send("You have already applied for this job");
}

/* =========================
CREATE APPLICATION
========================= */

const application = new Application({

userId: req.session.userId,
jobId: jobId,

name: req.body.name,
email: req.body.email,
phone: req.body.phone,

sscEducation: req.body.sscEducation,
sscUniversity: req.body.sscUniversity,
sscInstitute: req.body.sscInstitute,
sscPercentage: req.body.sscPercentage,
sscYear: req.body.sscYear,

hscEducation: req.body.hscEducation,
hscUniversity: req.body.hscUniversity,
hscInstitute: req.body.hscInstitute,
hscPercentage: req.body.hscPercentage,
hscYear: req.body.hscYear,

gradEducation: req.body.gradEducation,
gradUniversity: req.body.gradUniversity,
gradInstitute: req.body.gradInstitute,
gradPercentage: req.body.gradPercentage,
gradYear: req.body.gradYear,

address: req.body.address,
city: req.body.city,
state: req.body.state,

coverLetter: req.body.coverLetter,

resume: req.file ? req.file.filename : null

});

await application.save();


/* =========================
SAVE APPLICANT IN JOB
========================= */

const job = await Job.findById(jobId);

job.applications.push({
userId: req.session.userId
});

await job.save();


res.redirect("/applications");

} catch (error) {

console.error(error);
res.status(500).send("Error applying for job");

}

});


/* =================================================
VIEW USER APPLICATIONS
================================================= */

router.get("/applications", async (req, res) => {

try {

if (!req.session.userId) {
return res.redirect("/login");
}

const applications = await Application.find({
userId: req.session.userId
})
.populate("jobId")
.lean();

res.render("applications", { applications });

} catch (error) {

console.error(error);
res.status(500).send("Error loading applications");

}

});


module.exports = router;