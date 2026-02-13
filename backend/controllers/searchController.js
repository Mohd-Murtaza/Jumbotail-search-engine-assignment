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

    // Step 2: MongoDB aggregation pipeline with category-based filtering
    const searchRegex = new RegExp(correctedQuery.split(' ').join('|'), 'i');
    console.log(`🔎 Searching MongoDB with regex: /${correctedQuery.split(' ').join('|')}/i`);
    
    const dbStartTime = Date.now();
    
    // Build query conditions
    const matchQuery = {
      $or: [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
      ],
    };
    
    // Add category filter if detected by LLM
    if (intent.category && intent.category !== 'other') {
      console.log(`📁 Category detected: ${intent.category}`);
      // Use $or to boost exact category match, but still include others
      matchQuery.$or.push({ category: intent.category });
    }
    
    // Find products matching the query
    const products = await Product.find(matchQuery)
    .select('-__v')
    .lean()
    .limit(150); // Increased limit to get more candidates

    const dbTime = Date.now() - dbStartTime;
    console.log(`💾 MongoDB returned ${products.length} products in ${dbTime}ms`);

    // Step 3: Calculate rank score for each product (with category boost)
    console.log(`🎯 Calculating ranking scores...`);
    const rankedProducts = products.map(product => {
      let score = calculateRankScore(product, correctedQuery, intent);
      
      // Category match boost (if LLM detected category)
      if (intent.category && product.category === intent.category) {
        score += 30; // Significant boost for matching category
        console.log(`  ✨ Category boost (+30) for ${product.title}`);
      }
      
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
        category: product.category,
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
