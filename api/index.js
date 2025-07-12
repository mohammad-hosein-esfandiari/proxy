const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const proxyRoutes = require("../routes/my-vocab-app-proxy");
app.use("/api", proxyRoutes);

// ❗️نباید app.listen داشته باشی
module.exports.handler = serverless(app);
