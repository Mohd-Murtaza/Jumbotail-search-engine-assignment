// Fuzzy matching helper - handles spelling mistakes
const fuzzyMatch = (str1, str2) => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1.includes(s2) || s2.includes(s1)) return 1.0;
  
  // Calculate Levenshtein distance ratio
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};



const levenshteinDistance = (str1, str2) => {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) track[0][i] = i;
  for (let j = 0; j <= str2.length; j++) track[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  
  return track[str2.length][str1.length];
};

// Common spelling mistakes mapping
const spellingCorrections = {
  'iphone': ['ifone', 'iphon', 'iphone', 'aphone'],
  'samsung': ['samsang', 'samson', 'samsun'],
  'laptop': ['leptop', 'labtop', 'laptap'],
  'mobile': ['mobail', 'moble', 'mobil'],
  'headphone': ['hedphone', 'headfone', 'headfon'],
};

const correctSpelling = (query) => {
  let corrected = query.toLowerCase();
  
  for (const [correct, mistakes] of Object.entries(spellingCorrections)) {
    for (const mistake of mistakes) {
      if (corrected.includes(mistake)) {
        corrected = corrected.replace(new RegExp(mistake, 'gi'), correct);
      }
    }
  }
  
  return corrected;
};

// Intent detection - extract user intent from query
const detectIntent = (query) => {
  const lowerQuery = query.toLowerCase();
  const intent = {
    pricePreference: 'neutral', // cheap, expensive, neutral
    latestPreferred: false,
    color: null,
    storage: null,
    brand: null,
  };
  
  // Price intent detection (Hinglish support)
  if (lowerQuery.match(/sasta|cheap|budget|affordable|sastha|low price|kam price/)) {
    intent.pricePreference = 'cheap';
  } else if (lowerQuery.match(/expensive|premium|high end|luxury/)) {
    intent.pricePreference = 'expensive';
  }
  
  // Latest/new detection
  if (lowerQuery.match(/latest|new|newest|recent/)) {
    intent.latestPreferred = true;
  }
  
  // Color detection
  const colors = ['red', 'blue', 'black', 'white', 'green', 'gold', 'silver', 'pink', 'purple'];
  for (const color of colors) {
    if (lowerQuery.includes(color)) {
      intent.color = color;
      break;
    }
  }
  
  // Storage detection
  const storageMatch = lowerQuery.match(/(\d+)\s*(gb|tb|storage)/i);
  if (storageMatch) {
    intent.storage = storageMatch[1] + storageMatch[2].toUpperCase();
  }
  
  return intent;
};

// Advanced ranking algorithm
const calculateRankScore = (product, query, intent) => {
  let score = 0;
  const queryLower = query.toLowerCase();
  const titleLower = product.title.toLowerCase();
  const descLower = product.description.toLowerCase();
  
  // 1. Text Relevance (0-50 points)
  if (titleLower === queryLower) {
    score += 50; // Exact title match
  } else if (titleLower.includes(queryLower)) {
    score += 40; // Title contains query
  } else if (descLower.includes(queryLower)) {
    score += 20; // Description contains query
  } else {
    // Fuzzy matching for spelling mistakes
    const fuzzyScore = fuzzyMatch(titleLower, queryLower);
    if (fuzzyScore > 0.7) {
      score += fuzzyScore * 30;
    }
  }
  
  // 2. Rating Impact (0-20 points)
  score += (product.rating / 5) * 20;
  
  // 3. Stock Availability (15 points or -20 penalty)
  if (product.stock > 0) {
    score += 15;
    if (product.stock > 50) score += 5; // Bonus for high stock
  } else {
    score -= 20; // Heavy penalty for out of stock
  }
  
  // 4. Sales Popularity (0-15 points)
  score += Math.min((product.unitsSold / 100) * 15, 15);
  
  // 5. Return Rate (0-10 points, lower is better)
  score += Math.max(0, 10 - (product.returnRate / 2));
  
  // 6. Complaint Score (-15 to 5 points)
  score += Math.max(-15, 5 - (product.complaints * 2));
  
  // 7. Price/Discount Factor (0-15 points)
  const discount = product.mrp > 0 ? ((product.mrp - product.price) / product.mrp) * 100 : 0;
  score += Math.min(discount / 2, 15);
  
  // Intent-based boosting
  if (intent.pricePreference === 'cheap') {
    // Boost lower priced items
    score += Math.max(0, (50000 - product.price) / 5000);
  } else if (intent.pricePreference === 'expensive') {
    // Boost higher priced items
    score += Math.min(product.price / 10000, 10);
  }
  
  if (intent.latestPreferred) {
    // Check if product title contains high model numbers or "latest"
    if (titleLower.match(/16|17|18|pro|max|ultra|latest/)) {
      score += 20;
    }
  }
  
  if (intent.color) {
    // Exact color match in metadata or description
    const metadataStr = JSON.stringify(Object.fromEntries(product.metadata || new Map())).toLowerCase();
    if (titleLower.includes(intent.color) || descLower.includes(intent.color) || metadataStr.includes(intent.color)) {
      score += 25;
    }
  }
  
  if (intent.storage) {
    const metadataStr = JSON.stringify(Object.fromEntries(product.metadata || new Map())).toLowerCase();
    if (titleLower.includes(intent.storage.toLowerCase()) || metadataStr.includes(intent.storage.toLowerCase())) {
      score += 25;
    }
  }
  
  return Math.max(0, score);
};

module.exports = {
  fuzzyMatch,
  correctSpelling,
  detectIntent,
  calculateRankScore,
};
