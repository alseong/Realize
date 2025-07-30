# Simple Vercel Proxy Deployment Guide

This is the **simplest possible setup** to keep your API keys secure!

## Step 1: Deploy the Proxy

```bash
# Create and navigate to the proxy directory
mkdir groq-proxy
cd groq-proxy

# Copy the files I created:
# - api/analyze-html.js
# - package.json

# Deploy to Vercel
npx vercel
```

Follow the prompts:

- Login with GitHub/email
- Use all defaults
- It'll give you a URL like `https://groq-proxy-xyz.vercel.app`

## Step 2: Add Your API Key

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add: `GROQ_API_KEY` = `your_actual_groq_key`
5. Redeploy: `npx vercel --prod`

## Step 3: Update Your Extension

Update `src/background.ts` with your Vercel URL:

```typescript
const PROXY_URL = "https://your-project-name.vercel.app"; // Replace with your actual URL
```

## Step 4: Test

1. Build your extension: `npm run build`
2. Load it in Chrome
3. Test on a Realtor.ca page

## Security Benefits

✅ **API key never leaves Vercel's servers**  
✅ **No keys in your extension code**  
✅ **Free hosting** (100GB bandwidth/month)  
✅ **Automatic HTTPS** and security headers  
✅ **Global CDN** for fast responses

## Cost

- **Vercel**: Free (Hobby plan)
- **Groq API**: ~$0.0001 per request
- **Total**: Practically free for normal usage

## That's it! 🎉

Your API key is now secure and your extension is ready for distribution.
