/* ======================================================
APPLICATION SCHEMA
====================================================== */

const mongoose = require("mongoose");

/* =========================
APPLICATION SCHEMA DEFINITION
========================= */
const applicationSchema = new mongoose.Schema({
  /* =========================
  USER REFERENCE
  ========================= */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  /* =========================
  JOB REFERENCE
  ========================= */
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true
  },

  /* =========================
  APPLICANT DETAILS
  ========================= */
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },

  phone: {
    type: String,
    required: true,
    trim: true
  },

  coverLetter: {
    type: String,
    default: ""
  },

  /* =========================
  RESUME FILE NAME
  ========================= */
  resume: {
    type: String,
    required: true
  },

  /* =========================
  APPLICATION STATUS
  ========================= */
  status: {
    type: String,
    enum: ["Pending", "Reviewed", "Rejected", "Selected"],
    default: "Pending"
  },

  /* =========================
  DATE APPLIED
  ========================= */
  appliedAt: {
    type: Date,
    default: Date.now
  }
},
{
  timestamps: true
});

/* ======================================================
PREVENT DUPLICATE APPLICATION
====================================================== */
applicationSchema.index(
  { userId: 1, jobId: 1 },
  { unique: true }
);

/* ======================================================
EXPORT MODEL
====================================================== */
module.exports = mongoose.model("Application", applicationSchema);