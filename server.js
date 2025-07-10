const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// مسیر پراکسی
const proxyRoutes = require("./routes/my-vocab-app-proxy");
app.use("/api", proxyRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server is running on port http://localhost:${PORT}`);
});
