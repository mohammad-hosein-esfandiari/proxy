const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const serverless = require("serverless-http");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// مسیر پراکسی
const proxyRoutes = require("../routes/my-vocab-app-proxy");
app.use("/api", proxyRoutes);

// خروجی به صورت handler
module.exports.handler = serverless(app);
