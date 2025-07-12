const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const serverless = require("serverless-http");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const proxyRoutes = require("./routes/my-vocab-app-proxy");
app.use("/api", proxyRoutes);

// ❌ نباید app.listen() داشته باشی
module.exports.handler = serverless(app);
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Proxy server is running on port http://localhost:${PORT}`);
// }); 
