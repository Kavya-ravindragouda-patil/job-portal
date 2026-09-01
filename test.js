const { describe, it } = require("node:test");
const request = require("supertest");
const express = require("express");

const app = express();
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

describe("Farm2Home", () => {
  it("health endpoint should return 200", async () => {
    const response = await request(app).get("/health");
    if (response.statusCode !== 200 || response.body.status !== "ok") {
      throw new Error("Health test failed");
    }
  });
});
