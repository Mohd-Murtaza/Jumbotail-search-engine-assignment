const Groq = require("groq-sdk");

// Lazy initialization - will be created on first use
let groqClient = null;
let clientInitialized = false;

// Initialize Groq client lazily
const getGroqClient = () => {
  if (!clientInitialized) {
    clientInitialized = true;
    if (process.env.GROQ_API_KEY) {
      groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
      console.log("✅ Groq client initialized with API key");
    } else {
      console.log("⚠️  GROQ_API_KEY not found in environment variables");
    }
  }
  return groqClient;
};

// In-memory cache for LLM responses (30 min TTL)
const llmCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Clean old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of llmCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      llmCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * Enhanced query correction and intent detection using Groq LLM
 * Falls back to manual methods if LLM fails or times out
 */
const enhanceQueryWithLLM = async (query) => {
  // Check cache first
  if (llmCache.has(query)) {
    const cached = llmCache.get(query);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ LLM Cache hit for query: "${query}"`);
      return { ...cached.result, cached: true };
    }
  }

  // If no API key, return null (will fallback)
  if (!getGroqClient()) {
    console.log('⚠️  No GROQ_API_KEY found, using manual fallback');
    return null;
  }

  try {
    console.log(`🤖 Calling Groq LLM for query: "${query}"...`);
    const startTime = Date.now();
    
    // Race between LLM call and timeout (250ms max)
    const result = await Promise.race([
      callGroqAPI(query),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LLM timeout')), 800)
      )
    ]);

    const llmTime = Date.now() - startTime;
    console.log(`✅ LLM response in ${llmTime}ms: "${result.corrected}" | Intent: ${JSON.stringify(result.intent)}`);

    // Cache successful result
    llmCache.set(query, {
      result,
      timestamp: Date.now()
    });

    return { ...result, cached: false };

  } catch (error) {
    // Timeout or API error - fallback to manual
    console.log(`❌ LLM enhancement failed: ${error.message}, using manual fallback`);
    return null;
  }
};

/**
 * Call Groq API with structured output
 */
const callGroqAPI = async (query) => {
  const client = getGroqClient();
  if (!client) {
    throw new Error('Groq client not initialized');
  }

  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant", // Fastest model
    messages: [
      {
        role: "system",
        content: `You are an e-commerce search query enhancer for electronics products. 
Your task:
1. Correct spelling mistakes (e.g., "ifone" -> "iphone", "eyarfone" -> "earphone")
2. Extract user intent:
   - Price preference: cheap/expensive/neutral (Hinglish: sasta, sastha, kam price = cheap)
   - Latest preference: true if user wants newest models
   - Color: if mentioned
   - Storage: if mentioned (e.g., 128GB)

Return ONLY valid JSON, no extra text:
{
  "corrected": "corrected query string",
  "intent": {
    "pricePreference": "cheap|expensive|neutral",
    "latestPreferred": true|false,
    "color": "colorname or null",
    "storage": "128GB or null"
  }
}`
      },
      {
        role: "user",
        content: `Query: "${query}"`
      }
    ],
    temperature: 0.3,
    max_tokens: 150,
    top_p: 0.9,
  });

  const content = completion.choices[0]?.message?.content || '{}';
  
  // Parse JSON response
  try {
    const parsed = JSON.parse(content);
    return {
      corrected: parsed.corrected || query,
      intent: {
        pricePreference: parsed.intent?.pricePreference || 'neutral',
        latestPreferred: parsed.intent?.latestPreferred || false,
        color: parsed.intent?.color || null,
        storage: parsed.intent?.storage || null,
      }
    };
  } catch (err) {
    console.error('Failed to parse LLM response:', content);
    return null;
  }
};

module.exports = {
  enhanceQueryWithLLM,
};
