const Product = require("../models/Product");
const { correctSpelling, detectIntent, calculateRankScore } = require("../utils/rankingUtils");
const { enhanceQueryWithLLM } = require("../utils/llmEnhancer");

// GET /api/v1/search/product?query=
const searchProducts = async (req, res) => {
  try {
    const startTime = Date.now();
    const { query } = req.query;

    console.log(`\n🔍 Search Request: "${query}"`);

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    let correctedQuery = query;
    let intent = {};
    let enhancementMethod = 'manual'; // Track which method was used

    // Step 1: Try LLM enhancement (with timeout and fallback)
    const llmResult = await enhanceQueryWithLLM(query);
    
    if (llmResult) {
      // LLM succeeded
      correctedQuery = llmResult.corrected;
      intent = llmResult.intent;
      enhancementMethod = llmResult.cached ? 'llm-cached' : 'llm';
      console.log(`📝 Using LLM enhancement (${enhancementMethod})`);
    } else {
      // Fallback to manual methods
      correctedQuery = correctSpelling(query);
      intent = detectIntent(correctedQuery);
      enhancementMethod = 'manual-fallback';
      console.log(`📝 Using manual fallback | Corrected: "${correctedQuery}"`);
    }

    // Step 2: MongoDB text search with fuzzy tolerance
    const searchRegex = new RegExp(correctedQuery.split(' ').join('|'), 'i');
    console.log(`🔎 Searching MongoDB with regex: /${correctedQuery.split(' ').join('|')}/i`);
    
    const dbStartTime = Date.now();
    // Find products matching the query
    const products = await Product.find({
      $or: [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
      ],
    })
    .select('-__v')
    .lean()
    .limit(100); // Limit to keep performance good

    const dbTime = Date.now() - dbStartTime;
    console.log(`💾 MongoDB returned ${products.length} products in ${dbTime}ms`);

    // Step 3: Calculate rank score for each product
    console.log(`🎯 Calculating ranking scores...`);
    const rankedProducts = products.map(product => {
      const score = calculateRankScore(product, correctedQuery, intent);
      return {
        ...product,
        _rankScore: score,
      };
    });

    // Step 4: Sort by rank score (descending)
    rankedProducts.sort((a, b) => b._rankScore - a._rankScore);

    // Log top 3 results
    if (rankedProducts.length > 0) {
      console.log(`🏆 Top 3 results:`);
      rankedProducts.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.title} (Score: ${p._rankScore.toFixed(1)}, Price: ₹${p.price}, Stock: ${p.stock})`);
      });
    }

    // Step 5: Format response
    const formattedProducts = rankedProducts.map(product => {
      // Convert metadata Map to object (handle both Map and plain object)
      let metadataObj = {};
      if (product.metadata) {
        if (product.metadata instanceof Map) {
          metadataObj = Object.fromEntries(product.metadata);
        } else if (typeof product.metadata === 'object') {
          metadataObj = product.metadata;
        }
      }
      
      return {
        productId: product._id,
        title: product.title,
        description: product.description,
        mrp: product.mrp,
        SellingPrice: product.price,
        rating: product.rating,
        Metadata: metadataObj,
        stock: product.stock,
      };
    });

    const latency = Date.now() - startTime;
    console.log(`⚡ Total response time: ${latency}ms\n`);

    res.status(200).json({
      success: true,
      data: formattedProducts,
      meta: {
        totalResults: formattedProducts.length,
        query: query,
        correctedQuery: correctedQuery !== query ? correctedQuery : undefined,
        intent: intent,
        enhancementMethod: enhancementMethod,
        latency: `${latency}ms`,
      },
    });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

module.exports = {
  searchProducts,
};
