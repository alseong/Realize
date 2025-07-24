# API Keys Setup Guide

This extension uses two AI services for data extraction. Follow these steps to configure the API keys.

## 🤖 Groq API (HTML Analysis) - Optional

The extension comes with a demo Groq API key that should work for testing. For production use:

1. **Get API Key**: Visit [Groq Console](https://console.groq.com/)
2. **Sign up/Login** and navigate to API Keys
3. **Create new key** and copy it
4. **Update the key** in `src/background.ts`:
   ```typescript
   const GROQ_API_KEY = "your-groq-api-key-here";
   ```

## 📸 OpenAI API (Screenshot Analysis) - Required

**This is required for the screenshot extraction feature to work:**

1. **Get API Key**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Sign up/Login** and create a new API key
3. **Copy the key** (starts with `sk-`)
4. **Update the key** in `src/background.ts`:
   ```typescript
   const OPENAI_API_KEY = "sk-your-actual-openai-api-key-here";
   ```

## 💰 API Costs

### Groq API

- **Free tier**: 14,400 requests/day
- **Cost**: Very low (~$0.0001 per request)
- **Model**: llama-3.1-8b-instant

### OpenAI API

- **Cost**: ~$0.01-0.02 per screenshot analysis
- **Model**: gpt-4o with vision
- **Billing**: Pay-per-use (requires payment method)

## 🔧 Setup Steps

1. **Configure API keys** in `src/background.ts`
2. **Rebuild the extension**:
   ```bash
   npm run build
   ```
3. **Reload extension** in Chrome:
   - Go to `chrome://extensions/`
   - Click the reload button on your extension

## ✅ Testing

1. Visit a Realtor.ca property listing
2. Try both extraction methods:
   - **🤖 HTML Extract** (uses Groq)
   - **📸 Screenshot Extract** (uses OpenAI)
3. Check browser console for any API errors

## 🚨 Troubleshooting

### Common Issues

**"OpenAI API key not configured"**

- Make sure you updated the `OPENAI_API_KEY` in `src/background.ts`
- Rebuild and reload the extension

**"API rate limit exceeded"**

- You've hit the API rate limit
- Wait or upgrade your API plan

**"Invalid API key"**

- Double-check the API key is correct
- Ensure no extra spaces or characters

**Screenshot button shows "❌ Screenshot Failed"**

- Check your OpenAI API key
- Verify you have sufficient credits
- Check browser console for detailed errors

## 🔒 Security Notes

- API keys are stored in the background script (not accessible to web pages)
- Keys are not transmitted to any external services except the respective AI providers
- Consider using environment variables for production deployments

---

**Need Help?** Check the browser console (F12) for detailed error messages.
