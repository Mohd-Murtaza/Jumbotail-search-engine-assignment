# 🔍 E-Commerce Search Engine - Jumbotail Assignment

Advanced search microservice for e-commerce with LLM-powered spell correction, Hinglish support, and intelligent ranking.

## 🚀 Live Demo

**Backend API:** https://jumbotail-search-engine-assignment.vercel.app

## 📋 API Endpoints

Total APIs: **3**

### 1. Create Product
```http
POST /api/v1/product
```
Create a new product with validation.

**Request Body:**
```json
{
  "title": "iPhone 15 Pro",
  "description": "Latest iPhone with A17 chip",
  "price": 99900,
  "mrp": 129900,
  "rating": 4.5,
  "stock": 50,
  "category": "phones"
}
```

### 2. Update Product Metadata
```http
PUT /api/v1/product/meta-data
```
Update business signals for ranking.

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "unitsSold": 1500,
  "returnRate": 5.2,
  "complaints": 12
}
```

### 3. Search Products
```http
GET /api/v1/search/product?query=<search_term>
```
Intelligent search with spell correction, Hinglish support, and ranking.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "productId": "...",
      "title": "iPhone 15 Pro",
      "description": "...",
      "category": "phones",
      "mrp": 129900,
      "SellingPrice": 99900,
      "rating": 4.5,
      "stock": 50,
      "Metadata": {...}
    }
  ],
  "meta": {
    "totalResults": 20,
    "query": "ifone",
    "correctedQuery": "iphone",
    "intent": {
      "pricePreference": "neutral",
      "latestPreferred": false,
      "color": null,
      "storage": null,
      "category": "phones"
    },
    "enhancementMethod": "llm",
    "latency": "466ms"
  }
}
```

## 🧪 Edge Case Queries

### 1. Spelling Mistakes
```bash
# Query with typo
curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=ifone"
# ✅ Corrected to: "iphone"

curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=samsang"
# ✅ Corrected to: "samsung"

curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=leptop"
# ✅ Corrected to: "laptop"
```

### 2. Hinglish Support
```bash
# Cheap products
curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=sasta%20mobile"
# ✅ Returns cheapest mobiles first

# Expensive products
curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=mehnga%20laptop"
# ✅ Returns most expensive laptops first
```

### 3. Category Detection
```bash
# Automatically detects "phones" category
curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=mobile"
# ✅ Phones category products boosted

# Detects "laptops" category
curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=laptop"
# ✅ Laptop category products prioritized
```

### 4. Color Intent
```bash
# Black laptops
curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=black%20laptop"
# ✅ Black colored laptops ranked higher

# Silver phones
curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=silver%20phone"
# ✅ Silver products get +25 boost
```

### 5. Multi-Term Matching
```bash
# Both terms must match for high score
curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=red%20mobile"
# ✅ Products matching BOTH "red" AND "mobile" ranked highest
```

### 6. Storage Intent
```bash
curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=128gb%20phone"
# ✅ Detects storage preference, boosts matching products
```

### 7. Latest Preference
```bash
curl "https://jumbotail-search-engine-assignment.vercel.app/api/v1/search/product?query=latest%20iphone"
# ✅ Detects latest preference, boosts newer models
```

## 🎯 Features

### Search Capabilities
- ✅ **Spell Correction**: Groq LLM (250ms timeout) + Levenshtein fallback
- ✅ **Hinglish Support**: "sasta" → cheap, "mehnga" → expensive
- ✅ **Category Detection**: LLM detects phones/laptops/tablets/accessories
- ✅ **Intent Detection**: Price, color, storage, latest preference
- ✅ **Multi-term Matching**: Prioritizes products matching ALL query terms
- ✅ **Performance**: <1000ms response time (actual: 200-900ms)

### Ranking Algorithm (7 Factors)
1. **Text Relevance** (0-50 points): Multi-term matching with fallback
2. **Rating Impact** (0-20 points): Product rating normalized
3. **Stock Availability** (15 or -20 points): Penalty for out-of-stock
4. **Sales Popularity** (0-15 points): Based on units sold
5. **Return Rate** (0-10 points): Lower is better
6. **Complaint Score** (-15 to 5 points): Fewer complaints = higher score
7. **Discount Impact** (0-15 points): Higher discount = better visibility

### Intent Boosting
- **Category Match**: +30 points (LLM detected category)
- **Price Preference**: 
  - Cheap: up to +50 points (cheaper products)
  - Expensive: up to +30 points (premium products)
- **Color Match**: +25 points
- **Storage Match**: +25 points
- **Latest Preference**: +20 points

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas with text indexes
- **LLM**: Groq (llama-3.1-8b-instant)
- **Web Scraping**: Playwright (Chromium)
- **Data**: 614 real products (194 API + 420 scraped)

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/yourusername/Jumbotail-search-engine-assignment.git
cd Jumbotail-search-engine-assignment/backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Add: MONGODB_URI, GROQ_API_KEY, PORT=8080

# Seed database with real products
node scripts/scrapeProducts.js

# Start server
npm run dev
```

## 🔧 Environment Variables

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jumbotail
GROQ_API_KEY=gsk_your_api_key_here
PORT=8080
```

## 📊 Database Schema

```javascript
{
  title: String,              // Product name
  description: String,        // Product description
  category: String,           // phones/laptops/tablets/accessories/other
  price: Number,              // Selling price
  mrp: Number,                // Maximum retail price
  rating: Number,             // 0-5 stars
  stock: Number,              // Available quantity
  unitsSold: Number,          // Total sales count
  returnRate: Number,         // Return percentage (0-100)
  complaints: Number,         // Customer complaints count
  metadata: Map,              // Additional key-value data
  currency: String            // Rupee/USD/EUR
}
```

## 🧪 Testing Examples

### Using cURL
```bash
# Basic search
curl "http://localhost:8080/api/v1/search/product?query=iphone"

# With jq for pretty output
curl -s "http://localhost:8080/api/v1/search/product?query=sasta%20mobile" | jq '.data[0:3]'

# Check intent detection
curl -s "http://localhost:8080/api/v1/search/product?query=red%20mobile" | jq '.meta.intent'
```

### Response Time
- **Average**: 300-600ms
- **With LLM**: 400-900ms
- **Manual Fallback**: 200-400ms
- **Requirement**: <1000ms ✅

## 📈 Performance Metrics

- **Total Products**: 614 real products
- **Search Latency**: 200-929ms (under 1000ms requirement)
- **LLM Timeout**: 250ms (with fallback)
- **Cache TTL**: 30 minutes
- **Database Query**: 200-500ms with indexes

## 🎨 Data Sources

1. **DummyJSON API**: 194 products (electronics category)
2. **Web Scraping**: 420 products from webscraper.io (legal practice site)
   - Laptops: 282 products
   - Tablets: 90 products
   - Phones: 48 products

## 🔐 Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────┐       ┌──────────────┐
│  Express    │◄─────►│  Groq LLM    │
│   Server    │       │  (Optional)  │
└──────┬──────┘       └──────────────┘
       │
       ▼
┌─────────────┐
│  MongoDB    │
│  (Atlas)    │
└─────────────┘
```

## 📝 Project Structure

```
backend/
├── controllers/
│   ├── productController.js    # Create & update APIs
│   └── searchController.js     # Search logic with LLM
├── models/
│   └── Product.js              # MongoDB schema
├── routes/
│   ├── productRoutes.js
│   └── searchRoutes.js
├── utils/
│   ├── rankingUtils.js         # 7-factor ranking algorithm
│   └── llmEnhancer.js          # Groq LLM integration
├── scripts/
│   └── scrapeProducts.js       # Data seeding with Playwright
├── config/
│   └── db.js                   # MongoDB connection
└── server.js                   # Express app
```

## 🚀 Deployment

Deployed on **Vercel** with MongoDB Atlas.

## 👨‍💻 Author

Mohd Murtaza

## 📄 License

MIT

---

**Note**: This is an assignment project for Jumbotail demonstrating advanced search engine capabilities with LLM integration, intelligent ranking, and Hinglish support.
