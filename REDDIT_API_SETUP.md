# Reddit API Setup Guide

## 🔑 Getting Reddit API Credentials

### Step 1: Create a Reddit Application

1. **Go to Reddit Apps**: Visit https://www.reddit.com/prefs/apps
2. **Click "Create App"** or "Create Another App"
3. **Fill out the form**:
   - **Name**: `IdeaFinder` (or your preferred app name)
   - **App type**: Select **"script"** for personal use
   - **Description**: `Sub-niche discovery tool using Reddit data`
   - **About URL**: Leave blank or add your website
   - **Redirect URI**: `http://localhost:4000` (required but not used for script apps)

4. **Click "Create app"**

### Step 2: Get Your Credentials

After creating the app, you'll see:
- **Client ID**: The string under your app name (looks like: `abc123def456`)
- **Client Secret**: The "secret" field (looks like: `xyz789-AbCdEf_GhIjKl`)

## 🔧 Setting Up Environment Variables

### Option 1: Create .env file (Recommended)

```bash
cd backend
cp .env.example .env
```

Then edit the `.env` file with your credentials:

```env
# Reddit API Configuration
REDDIT_CLIENT_ID=your_actual_client_id_here
REDDIT_CLIENT_SECRET=your_actual_client_secret_here
REDDIT_USER_AGENT=IdeaFinder/1.0.0 (by /u/yourusername)
```

### Option 2: Export Environment Variables

```bash
export REDDIT_CLIENT_ID="your_actual_client_id_here"
export REDDIT_CLIENT_SECRET="your_actual_client_secret_here"
export REDDIT_USER_AGENT="IdeaFinder/1.0.0 (by /u/yourusername)"
```

## 🚀 Running with API Credentials

```bash
# Start backend with your credentials
cd backend
npm run dev
```

## 🔍 Testing the Setup

```bash
# Test discovery with real Reddit data
curl -X POST http://localhost:4000/api/discover \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "AI productivity tools",
    "maxLevels": 2,
    "maxNodesPerLevel": 5,
    "sources": ["reddit"]
  }'
```

## ⚠️ Important Notes

### Rate Limiting
- **Without API credentials**: 60 requests per hour
- **With API credentials**: 600 requests per 10 minutes
- The system gracefully handles rate limits

### User Agent
- Reddit requires a descriptive User-Agent
- Format: `AppName/Version (by /u/yourusername)`
- Replace `yourusername` with your actual Reddit username

### Security
- **Never commit** your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Use different credentials for production

## 🔧 Troubleshooting

### "401 Unauthorized" Error
- Check your `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`
- Make sure there are no extra spaces in your `.env` file

### "429 Too Many Requests" Error
- You've hit the rate limit
- Wait a few minutes and try again
- Consider using API credentials for higher limits

### "403 Forbidden" Error
- Check your `REDDIT_USER_AGENT`
- Make sure it follows the required format
- Don't use generic user agents like "bot" or "scraper"

## 📊 What You'll Get

With proper API credentials, the Reddit analyzer will discover:

- **Level 0**: Your input niche (e.g., "AI productivity tools")
- **Level 1**: Relevant subreddits (e.g., r/MachineLearning, r/artificial)
- **Level 2+**: Popular topics from those subreddits

Each discovery includes:
- **Confidence scores** based on subscriber counts
- **Popularity metrics** from upvotes and comments
- **Real Reddit URLs** for further exploration
- **Quality filtering** to focus on engaged communities
