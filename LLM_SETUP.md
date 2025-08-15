# LLM-Powered Sub-Niche Discovery Setup

## 🧠 What Changed

The Reddit analyzer now uses **LangChain + OpenAI GPT** for intelligent sub-niche extraction instead of simple keyword matching.

### Before (Keyword Matching):
- Simple word frequency analysis
- Generic topic extraction
- Limited understanding of context

### After (LLM-Powered):
- **Intelligent analysis** of subreddit descriptions
- **Context-aware** sub-niche identification
- **Semantic understanding** of Reddit posts
- **Business-focused** opportunity detection

## 🔑 Setup Requirements

### 1. OpenAI API Key
Get your API key from: https://platform.openai.com/api-keys

### 2. Environment Configuration
Add to your `backend/.env` file:

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Reddit API (still needed for data fetching)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=IdeaFinder/1.0.0 (by /u/yourusername)
```

## 🚀 How It Works

### Level 1: Subreddit Analysis
For each discovered subreddit, the LLM analyzes:
- **Subreddit name** (e.g., r/Entrepreneur)
- **Description** and **community focus**
- **Parent niche context** (e.g., "AI productivity tools")

**LLM Prompt Example:**
```
PARENT NICHE: AI productivity tools
SUBREDDIT: r/Entrepreneur
DESCRIPTION: A community for entrepreneurs...

Identify 3-5 specific sub-niches that would be relevant...
Focus on business/product opportunities, not just general topics...
```

**Result:** Instead of "Entrepreneur", you get:
- "Startup Automation Tools" (confidence: 0.9)
- "Business Process AI" (confidence: 0.8)
- "Entrepreneurial Productivity" (confidence: 0.7)

### Level 2+: Post Analysis
For each subreddit, the LLM analyzes:
- **Top 15 hot posts** with high engagement
- **Post titles and content**
- **Community pain points and discussions**

**LLM Prompt Example:**
```
PARENT SUB-NICHE: Business Process AI - Entrepreneur
REDDIT POSTS:
1. [45 upvotes] "How to automate customer service with AI?"
2. [32 upvotes] "Best AI tools for email marketing?"
...

Identify 2-4 specific topics, pain points, or opportunities...
```

**Result:** Instead of generic keywords, you get:
- "Customer Service AI" (confidence: 0.8)
- "Email Marketing Automation" (confidence: 0.7)
- "Lead Generation Tools" (confidence: 0.6)

## 📊 Benefits

### Intelligent Sub-Niche Detection
- **Context-aware**: Understands business relevance
- **Specific**: "Email Marketing Automation" vs "Email"
- **Actionable**: Focuses on market opportunities

### Better Confidence Scoring
- **LLM reasoning**: Why this is a valid sub-niche
- **Market potential**: Based on content analysis
- **Engagement**: Weighted by Reddit activity

### Rich Metadata
Each discovered node includes:
- **LLM reasoning**: Why it's a sub-niche
- **Original subreddit**: Source community
- **Posts analyzed**: Number of posts examined
- **Confidence explanation**: Detailed scoring

## 🔄 Fallback System

**With OpenAI API Key:**
- ✅ LLM-powered intelligent extraction
- ✅ Context-aware sub-niche identification
- ✅ Business-focused analysis

**Without OpenAI API Key:**
- ⚠️ Falls back to keyword extraction
- ⚠️ Simple word frequency analysis
- ⚠️ Limited context understanding

The system **always works** - LLM just makes it much smarter!

## 🧪 Testing

```bash
# Start backend with LLM support
cd backend
npm run dev

# Test discovery
curl -X POST http://localhost:4000/api/discover \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "SaaS Business Tools",
    "maxLevels": 2,
    "maxNodesPerLevel": 4,
    "sources": ["reddit"]
  }'
```

**Check the logs for:**
```
Reddit Analyzer: Using OpenAI LLM for intelligent sub-niche extraction
```

**vs**

```
Reddit Analyzer: Using fallback keyword extraction (consider adding OPENAI_API_KEY for better results)
```

## 💡 Example Results

### Input: "Digital Marketing Tools"

**LLM-Powered Results:**
```
Level 0: Digital Marketing Tools
├── Level 1: Social Media Analytics (from r/marketing)
├── Level 1: Email Campaign Automation (from r/DigitalMarketing)
├── Level 1: SEO Content Optimization (from r/SEO)
└── Level 2: Instagram Growth Hacking (from Social Media Analytics)
```

**Keyword-Only Results:**
```
Level 0: Digital Marketing Tools
├── Level 1: marketing
├── Level 1: DigitalMarketing
├── Level 1: SEO
└── Level 2: growth
```

## 🔧 Cost Considerations

**OpenAI API Usage:**
- ~$0.001-0.003 per discovery job
- GPT-3.5-turbo for cost efficiency
- Smart prompt design to minimize tokens

**Rate Limits:**
- Reduced Reddit API calls (50 vs 100)
- Intelligent post filtering
- Parallel LLM processing

## 🎯 Next Steps

1. **Add your OpenAI API key** to `.env`
2. **Restart the backend** to pick up the new configuration
3. **Test with different niches** to see LLM-powered results
4. **Compare with/without** API key to see the difference

The system now provides **intelligent, business-focused sub-niche discovery** instead of simple keyword extraction! 🚀
