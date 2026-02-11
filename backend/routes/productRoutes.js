const express = require("express");
const { createProduct, updateMetadata } = require("../controllers/productController");

const router = express.Router();

// POST /api/v1/product
router.post("/product", createProduct);

// PUT /api/v1/product/meta-data
router.put("/product/meta-data", updateMetadata);

module.exports = router;
