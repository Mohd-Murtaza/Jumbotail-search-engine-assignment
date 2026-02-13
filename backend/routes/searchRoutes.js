const express = require("express");
const { searchProducts } = require("../controllers/searchController");

const router = express.Router();

// GET /api/v1/search/product?query=
router.get("/product", searchProducts);

module.exports = router;
