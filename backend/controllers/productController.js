const Product = require("../models/Product");

// POST /api/v1/product - Store Product in Catalog
const createProduct = async (req, res) => {
  try {
    const { title, description, rating, stock, price, mrp, currency } = req.body;

    // Simple validation
    if (!title || !description || rating === undefined || price === undefined || mrp === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, description, rating, price, mrp, stock",
      });
    }

    const product = new Product({
      title,
      description,
      rating: rating || 0,
      stock,
      price,
      mrp,
      currency: currency || "Rupee",
      unitsSold: req.body.unitsSold || 0,
      returnRate: req.body.returnRate || 0,
      complaints: req.body.complaints || 0,
    });

    await product.save();

    res.status(201).json({
      success: true,
      productId: product._id,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

// PUT /api/v1/product/meta-data - Update Metadata for the Product
const updateMetadata = async (req, res) => {
  try {
    const { productId, Metadata } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!Metadata || typeof Metadata !== "object") {
      return res.status(400).json({
        success: false,
        message: "Metadata must be an object",
      });
    }

    // Use findByIdAndUpdate for atomic operation - best practice
    const product = await Product.findByIdAndUpdate(
      productId,
      { metadata: new Map(Object.entries(Metadata)) },
      { 
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Convert metadata Map to object for response
    const metadataObj = {};
    product.metadata.forEach((value, key) => {
      metadataObj[key] = value;
    });

    res.status(200).json({
      success: true,
      productId: product._id,
      Metadata: metadataObj,
    });
  } catch (error) {
    console.error("Update metadata error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update metadata",
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  updateMetadata,
};
