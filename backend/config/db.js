const mongoose = require("mongoose");

const connectDB = async (mongoUri) => {
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in environment variables.");
  }

  await mongoose.connect(mongoUri);
};

module.exports = { connectDB };
