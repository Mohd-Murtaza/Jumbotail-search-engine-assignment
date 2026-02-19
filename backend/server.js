const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectDB } = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const searchRoutes = require("./routes/searchRoutes");

dotenv.config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Jumbotail Search Engine API",
    endpoints: {
      health: "/health",
      search: "/api/v1/search/product?query=iphone",
      createProduct: "POST /api/v1/product",
      updateMetadata: "PUT /api/v1/product/meta-data"
    }
  });
});

// API Routes
app.use("/api/v1", productRoutes);
app.use("/api/v1/search", searchRoutes);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "";

connectDB(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
