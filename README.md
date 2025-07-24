# Universal AI Cashflow Calculator - Chrome Extension

A powerful Chrome extension that extracts property data from any website and calculates real estate investment cashflow using AI-powered screenshot analysis.

## Features

🌐 **Universal Website Support:**

- Works on any real estate website (Realtor.ca, Zillow, MLS listings, etc.)
- AI-powered screenshot analysis using OpenAI Vision
- Smart fallback to DOM-based extraction

🎯 **In-App AI Extraction:**

- "Auto fill with AI" button inside the popup
- Full page screenshot capture (invisible to user)
- Automatic form population with extracted data

📊 **Advanced Cashflow Calculator:**

- Comprehensive investment metrics
- Cash-on-cash return calculation
- Cap rate analysis
- Monthly/annual cashflow projections
- Real-time calculations

## Setup Instructions

### 1. API Keys Configuration

#### Groq API Key (HTML Analysis)

The extension comes with a demo Groq API key, but for production use:

1. Get your API key from [Groq](https://console.groq.com/)
2. Update `GROQ_API_KEY` in `src/background.ts`

#### OpenAI API Key (Screenshot Analysis)

**Required for screenshot analysis feature:**

1. Get your API key from [OpenAI](https://platform.openai.com/api-keys)
2. Update `OPENAI_API_KEY` in `src/background.ts`:
   ```typescript
   const OPENAI_API_KEY = "sk-your-actual-openai-api-key-here";
   ```

### 2. Build and Install

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Load extension in Chrome:
# 1. Open Chrome and go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the 'dist' folder
```

## Usage

### On Realtor.ca Property Pages

The extension automatically detects Realtor.ca property listings and adds two extraction buttons:

1. **🤖 HTML Extract** - Analyzes page HTML content with Groq AI
2. **📸 Screenshot Extract** - Captures and analyzes page screenshot with OpenAI Vision

### Extraction Process

1. **Navigate** to any Realtor.ca property listing
2. **Choose** your preferred extraction method:
   - HTML Extract: Faster, works with page content
   - Screenshot Extract: More accurate, analyzes visual layout
3. **Click** the button and wait for AI analysis
4. **Open** the extension popup to see extracted data and calculate cashflow

### Cashflow Calculator

After data extraction, the popup provides:

- Property details summary
- Investment input fields
- Real-time cashflow calculations
- Advanced metrics (cap rate, cash-on-cash return)
- Monthly breakdown analysis

## Technical Details

### Architecture

- **Content Script**: Handles page interaction and data extraction
- **Background Script**: Manages AI API calls and screenshot capture
- **Popup UI**: React-based calculator interface with Material-UI

### AI Integration

- **Groq API**: Fast HTML content analysis using Llama models
- **OpenAI Vision**: Advanced screenshot analysis using GPT-4V

### Screenshot Capture

- Intelligent full-page capture
- Automatic scroll positioning for optimal content
- Focus on key property information areas

## Development

```bash
# Development mode with hot reload
npm run dev

# Type checking
npm run lint

# Build for production
npm run build
```

## File Structure

```
src/
├── App.tsx              # Main calculator UI
├── content-script.ts    # Page interaction logic
├── background.ts        # AI analysis & screenshot handling
├── types/
│   └── property.ts      # TypeScript type definitions
└── utils/
    └── cashflow.ts      # Calculation utilities
```

## API Usage & Costs

### Groq API

- **Model**: llama-3.1-8b-instant
- **Cost**: Very low cost per request
- **Speed**: Very fast response times

### OpenAI API

- **Model**: gpt-4o (with vision)
- **Cost**: ~$0.01-0.02 per image analysis
- **Accuracy**: High precision for visual data extraction

## Troubleshooting

### Screenshot Analysis Not Working

1. Verify OpenAI API key is correctly set in `src/background.ts`
2. Check browser console for API errors
3. Ensure sufficient OpenAI credits

### Extension Not Loading

1. Check `chrome://extensions/` for error messages
2. Rebuild extension: `npm run build`
3. Reload extension in Chrome

### Data Extraction Issues

1. Try the alternative extraction method
2. Check if page is fully loaded
3. Verify you're on a valid Realtor.ca listing page

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test with both extraction methods
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Note**: This extension is for educational and personal use. Ensure compliance with Realtor.ca's terms of service when using automated data extraction.
