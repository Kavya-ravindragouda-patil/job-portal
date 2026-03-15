// models/Resume.js

const mongoose = require("mongoose");

// Resume Schema
const resumeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true // remove extra spaces
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true // store email in lowercase
    },
    resumePath: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

// Export Resume model
module.exports = mongoose.model("Resume", resumeSchema);