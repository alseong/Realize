# Realtor.ca Cashflow Calculator Chrome Extension

A Chrome browser extension that automatically extracts property data from Realtor.ca listings and calculates real estate cashflow metrics for investment analysis.

## Features

- 🏠 **Automatic Data Extraction**: Extracts property price, address, bedrooms, bathrooms, and square footage from Realtor.ca listings
- 💰 **Cashflow Calculation**: Calculates monthly and annual cashflow, cash-on-cash return, and cap rate
- 📊 **Investment Metrics**: Provides comprehensive analysis including NOI, mortgage payments, and operating expenses
- 🎨 **Modern UI**: Clean, responsive interface built with Material-UI
- ⚡ **Real-time Analysis**: Instant calculations as you adjust parameters

## Installation

### Option 1: Load Unpacked Extension (Developer Mode)

1. **Build the Extension**:

   ```bash
   npm install
   npm run build
   ```

2. **Open Chrome Extensions**:

   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the Extension**:

   - Click "Load unpacked"
   - Select the `dist` folder from this project

4. **Verify Installation**:
   - The extension icon should appear in your Chrome toolbar
   - You should see "Realtor.ca Cashflow Calculator" in your extensions list

## Usage

### Step 1: Navigate to a Property Listing

- Go to [Realtor.ca](https://www.realtor.ca)
- Open any property listing page

### Step 2: Extract Property Data

- Look for the blue "💰 Calculate Cashflow" button in the top-right corner of the page
- Click the button to extract property data automatically
- The button will show "✅ Data Extracted!" when successful

### Step 3: Open the Calculator

- Click the extension icon in your Chrome toolbar
- The popup will open with the property data pre-filled

### Step 4: Enter Investment Parameters

- **Purchase Price**: Auto-filled from listing
- **Down Payment**: Auto-calculated (default 20%)
- **Interest Rate**: Mortgage interest rate (default 5.5%)
- **Loan Term**: Mortgage amortization period (default 25 years)
- **Monthly Rent**: Expected rental income

### Step 5: Configure Advanced Expenses (Optional)

- Click "Advanced Expenses" to expand
- **Property Taxes**: Annual property tax amount
- **Insurance**: Annual home insurance cost
- **Maintenance**: Annual maintenance and repairs budget
- **Property Management**: Annual property management fees
- **Vacancy Rate**: Expected vacancy percentage
- **Other Expenses**: Additional annual expenses

### Step 6: Calculate Results

- Click "Calculate Cashflow" button
- View results including:
  - **Monthly Cashflow**: Net monthly income after all expenses
  - **Annual Cashflow**: Net annual income
  - **Cash-on-Cash Return**: Annual return percentage on invested capital
  - **Cap Rate**: Property capitalization rate
  - **Monthly Breakdown**: Detailed income vs. expenses

## Calculated Metrics

### Cashflow Analysis

- **Monthly Income**: Rental income adjusted for vacancy
- **Monthly Expenses**: All operating expenses + mortgage payment
- **Net Cashflow**: Income minus expenses
- **Annual Cashflow**: Monthly cashflow × 12

### Investment Returns

- **Cash-on-Cash Return**: (Annual Cashflow ÷ Down Payment) × 100
- **Cap Rate**: (Net Operating Income ÷ Purchase Price) × 100

### Default Assumptions

- Down Payment: 20% of purchase price
- Interest Rate: 5.5% annually
- Loan Term: 25 years
- Property Tax Rate: 1.2% of property value
- Insurance Rate: 0.3% of property value
- Maintenance Rate: 1.0% of property value
- Property Management: 8% of rental income
- Vacancy Rate: 5%

## Technical Details

### Architecture

- **Manifest V3**: Latest Chrome extension format
- **React + TypeScript**: Modern frontend framework
- **Material-UI**: Professional UI components
- **Vite**: Fast build tool and development server

### File Structure

```
src/
├── types/property.ts          # TypeScript interfaces
├── utils/cashflow.ts          # Calculation functions
├── content-script.ts          # Realtor.ca page interaction
├── background.ts              # Extension service worker
├── App.tsx                    # Main popup component
└── main.tsx                   # React app entry point
```

### Security & Privacy

- **No Data Collection**: All calculations performed locally
- **Minimal Permissions**: Only accesses Realtor.ca pages
- **Local Storage**: Property data stored locally in browser
- **No External APIs**: No data sent to external servers

## Development

### Prerequisites

- Node.js 16+ and npm
- Chrome browser

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd realtor-ca-cashflow-calculator

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development Mode

```bash
npm run dev
```

Then load the `dist` folder as an unpacked extension in Chrome.

## Troubleshooting

### Extension Not Working

1. Ensure you're on a Realtor.ca property listing page
2. Refresh the page after installing the extension
3. Check that the extension is enabled in Chrome settings

### Data Not Extracting

1. Try clicking the "Calculate Cashflow" button again
2. Different listing layouts may require manual input
3. Check browser console for any error messages

### Build Issues

1. Ensure Node.js 16+ is installed
2. Delete `node_modules` and run `npm install` again
3. Check that all dependencies are properly installed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the extension thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Disclaimer

This tool is for educational and informational purposes only. Always consult with real estate professionals and conduct thorough due diligence before making investment decisions. The calculations provided are estimates and may not reflect actual investment performance.
