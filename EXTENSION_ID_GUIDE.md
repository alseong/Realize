# How to Find Your Chrome Extension ID

## Step 1: Load Your Extension

1. Build your extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select your `dist` folder
5. Your extension will appear in the list

## Step 2: Find Your Extension ID

Look at your extension in the list - you'll see an ID like:

- `abcdefghijklmnopqrstuvwxyz123456`
- `chrome-extension://abcdefghijklmnopqrstuvwxyz123456`

**Copy this ID!**

## Step 3: Update the Proxy Security

Update `groq-proxy/api/analyze-html.js` with your actual extension ID:

```javascript
const allowedOrigins = [
  "chrome-extension://abcdefghijklmnopqrstuvwxyz123456", // Replace with your actual ID
  "moz-extension://abcdefghijklmnopqrstuvwxyz123456", // if supporting Firefox
];
```

## Step 4: Redeploy the Proxy

```bash
cd groq-proxy
npx vercel --prod
```

## Step 5: Test Security

Try calling your API from a browser console:

```javascript
fetch("https://realize-ten.vercel.app/api/analyze-html", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ htmlContent: "test", url: "https://example.com" }),
});
```

**This should return a 403 Forbidden error** because it's not coming from your extension.

## Security Benefits

✅ **Only your extension can call the API**  
✅ **Prevents unauthorized usage**  
✅ **Protects your API quota**  
✅ **Blocks malicious requests**

## Troubleshooting

**If you get CORS errors:**

- Make sure you're using the exact extension ID
- Check that the ID includes the `chrome-extension://` prefix
- Redeploy after updating the ID

**If you get 403 errors from your extension:**

- Double-check the extension ID is correct
- Make sure you're using the full ID with prefix
