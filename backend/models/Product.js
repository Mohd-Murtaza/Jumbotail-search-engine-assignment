const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be more than 5"],
      default: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Price cannot be negative"],
    },
    mrp: {
      type: Number,
      required: [true, "MRP is required"],
      min: [0, "MRP cannot be negative"],
    },
    currency: {
      type: String,
      default: "Rupee",
      enum: ["Rupee", "USD", "EUR"],
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
    category: {
      type: String,
      enum: ["phones", "laptops", "tablets", "accessories", "other"],
      default: "other",
      index: true,
    },
    // Business signals for ranking
    unitsSold: {
      type: Number,
      default: 0,
      min: 0,
    },
    returnRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100, // percentage
    },
    complaints: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Search optimization
    searchTerms: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search
productSchema.index({ title: "text", description: "text" });

// Compound index for filtering and sorting
productSchema.index({ rating: -1, unitsSold: -1, price: 1 });

// Virtual field for discount percentage
productSchema.virtual("discountPercent").get(function () {
  if (this.mrp > 0) {
    return Math.round(((this.mrp - this.price) / this.mrp) * 100);
  }
  return 0;
});

// Method to calculate ranking score
productSchema.methods.calculateRankScore = function (query = "") {
  let score = 0;

  // Text relevance boost
  const titleLower = this.title.toLowerCase();
  const queryLower = query.toLowerCase();
  if (titleLower.includes(queryLower)) {
    score += 50;
  }

  // Rating weight (0-5 -> 0-20 points)
  score += this.rating * 4;

  // Stock availability boost
  if (this.stock > 0) {
    score += 15;
  } else {
    score -= 20; // penalty for out of stock
  }

  // Sales popularity (normalized)
  score += Math.min(this.unitsSold / 10, 20);

  // Low return rate boost
  score += Math.max(0, 10 - this.returnRate / 2);

  // Price competitiveness (discount %)
  const discount = this.discountPercent;
  score += Math.min(discount / 2, 10);

  // Complaint penalty
  score -= Math.min(this.complaints * 2, 15);

  return Math.max(0, score);
};

// Ensure virtual fields are serialized
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
