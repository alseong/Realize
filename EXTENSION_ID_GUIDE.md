# Chrome Extension OAuth Setup Guide

## 🚨 **IMPORTANT: OAuth Configuration for Production**

When you publish your extension to Chrome Web Store, Google assigns a **new extension ID**. This breaks OAuth because the redirect URLs change.

## Step 1: Find Your Extension IDs

### Local Development ID:

1. Build: `npm run build`
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Load your `dist` folder
5. Copy the extension ID (e.g., `fhlkhckjdbmcgbignfjdjfdepcknmlej`)

### Published Extension ID:

1. After publishing to Chrome Web Store
2. Install your published extension
3. Go to `chrome://extensions/`
4. Copy the new extension ID

## Step 2: Update Supabase OAuth Settings

In your Supabase dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add **BOTH** redirect URLs to "Redirect URLs":
   ```
   https://fhlkhckjdbmcgbignfjdjfdepcknmlej.chromiumapp.org/
   https://YOUR_PUBLISHED_EXTENSION_ID.chromiumapp.org/
   ```

## Step 3: Update Google Cloud OAuth Settings

In Google Cloud Console:

1. Go to **APIs & Services** → **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add **BOTH** redirect URIs to "Authorized redirect URIs":
   ```
   https://ovdokgutixbjhmfqbwet.supabase.co/auth/v1/callback
   https://fhlkhckjdbmcgbignfjdjfdepcknmlej.chromiumapp.org/
   https://YOUR_PUBLISHED_EXTENSION_ID.chromiumapp.org/
   ```

## Step 4: Update API Security (Optional)

If you're using the Groq proxy, update `groq-proxy/api/analyze-html.js`:

```javascript
const allowedOrigins = [
  "chrome-extension://fhlkhckjdbmcgbignfjdjfdepcknmlej", // Local dev
  "chrome-extension://YOUR_PUBLISHED_EXTENSION_ID", // Published
];
```

Then redeploy:

```bash
cd groq-proxy
npx vercel --prod
```

## ✅ **Why This Works:**

- **Dynamic Redirect URLs**: The code uses `chrome.identity.getRedirectURL()` to automatically get the correct URL
- **Multiple Configurations**: Both Supabase and Google accept multiple redirect URLs
- **Seamless Switching**: Works for both development and production without code changes

## 🔧 **Troubleshooting:**

**"Invalid Redirect" Error:**

- Make sure you added BOTH extension IDs to Supabase and Google Cloud
- Check that URLs end with `.chromiumapp.org/`
- Wait a few minutes after updating settings

**"Authorization page could not be loaded":**

- Verify the extension ID is correct
- Check that OAuth is enabled in Supabase
- Ensure Google Cloud project has the correct redirect URIs

**OAuth works locally but not in production:**

- This is exactly the issue we're solving!
- Follow steps 2-3 above to add the published extension ID

## 📝 **Quick Checklist:**

- [ ] Found local extension ID
- [ ] Found published extension ID (after publishing)
- [ ] Added both IDs to Supabase redirect URLs
- [ ] Added both IDs to Google Cloud redirect URIs
- [ ] Updated API security (if applicable)
- [ ] Tested both local and published versions
