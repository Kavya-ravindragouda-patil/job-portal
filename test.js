const { describe, it } = require("node:test");
const request = require("supertest");
const express = require("express");

const app = express();

app.get("/test", (req, res) => {
    res.status(200).send("Job Portal is working");
});

describe("Job Portal Test", () => {
    it("should return 200 for /test", async () => {
        const response = await request(app).get("/test");

        if (response.statusCode !== 200) {
            throw new Error("Test failed");
        }
    });
});
