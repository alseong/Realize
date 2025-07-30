import type { ChromeExtensionMessage, PropertyData } from "./types/property";

// Use Vercel proxy to keep API keys secure
const PROXY_URL = "https://realize-ten.vercel.app";

/**
 * Extract clean text content from HTML for AI analysis
 */
function extractCleanText(htmlContent: string, url: string): string {
  try {
    // Check if this is a Realtor.ca page
    const isRealtorCa = url.includes("realtor.ca");

    if (isRealtorCa) {
      // For Realtor.ca, extract text from specific sections
      const relevantText: string[] = [];

      // Try to find content within specific div IDs
      const realtorSelectors = [
        "listingDetailsTopCon",
        "listingDetailsTabsCon",
        "listingDetailsBuildingCon",
        "propertyDetailsRoomsSection",
        "propertyDetailsLandSection",
      ];

      for (const id of realtorSelectors) {
        // Simple search for the ID in the HTML
        const idIndex = htmlContent.indexOf(`id="${id}"`);
        if (idIndex !== -1) {
          // Find the opening tag for this ID
          const tagStartIndex = htmlContent.lastIndexOf("<", idIndex);
          if (tagStartIndex !== -1) {
            // Find the matching closing tag for this entire section
            let depth = 0;
            let endIndex = -1;
            let currentIndex = tagStartIndex;

            while (currentIndex < htmlContent.length) {
              const nextOpenTag = htmlContent.indexOf("<", currentIndex);
              const nextCloseTag = htmlContent.indexOf("</", currentIndex);

              if (nextOpenTag === -1 && nextCloseTag === -1) {
                // No more tags, use end of content
                endIndex = htmlContent.length;
                break;
              }

              if (
                nextOpenTag !== -1 &&
                (nextCloseTag === -1 || nextOpenTag < nextCloseTag)
              ) {
                // Found opening tag
                const tagName = htmlContent.substring(
                  nextOpenTag + 1,
                  htmlContent.indexOf(" ", nextOpenTag + 1)
                );
                if (tagName && !tagName.startsWith("/")) {
                  depth++;
                  currentIndex = nextOpenTag + 1;
                } else {
                  currentIndex = nextOpenTag + 1;
                }
              } else if (nextCloseTag !== -1) {
                // Found closing tag
                depth--;
                if (depth === 0) {
                  // Found the matching closing tag for our section
                  endIndex = htmlContent.indexOf(">", nextCloseTag);
                  break;
                }
                currentIndex = nextCloseTag + 1;
              } else {
                currentIndex = htmlContent.length;
              }
            }

            if (endIndex === -1) {
              endIndex = htmlContent.length;
            }

            // Extract the entire section including all child content
            const fullSection = htmlContent.substring(
              tagStartIndex,
              endIndex + 1
            );

            // Clean the HTML tags but preserve some structure
            const cleanText = fullSection
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove scripts
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove styles
              .replace(/<[^>]*>/g, " ") // Remove remaining HTML tags
              .replace(/\s+/g, " ") // Normalize whitespace
              .trim();

            if (cleanText && cleanText.length > 10) {
              relevantText.push(cleanText);
            }
          }
        }
      }

      // If we found Realtor.ca specific text, return it
      if (relevantText.length > 0) {
        const finalText = relevantText.join(" ");
        return finalText;
      }
    }

    // For non-Realtor.ca pages or if Realtor.ca sections not found, extract all visible text
    const cleanText = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove styles
      .replace(/<[^>]*>/g, " ") // Remove all HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    const finalText = cleanText.substring(0, 8000); // Limit to 8000 chars for token efficiency
    return finalText;
  } catch (error) {
    console.error("Error extracting text:", error);
    return htmlContent.substring(0, 8000); // Fallback with limited content
  }
}

/**
 * Analyze HTML content using Groq API
 */
async function analyzeHtmlContentWithGroq(
  htmlContent: string,
  url: string
): Promise<PropertyData | null> {
  try {
    // Extract clean text content
    const cleanText = extractCleanText(htmlContent, url);
    const maxLength = 8000; // Limit text content for token efficiency
    const truncatedText =
      cleanText.length > maxLength
        ? cleanText.substring(0, maxLength) + "...[truncated]"
        : cleanText;

    const prompt = `Here is the provided listing details:
${truncatedText}

PROMPT:
You are a data extraction tool. Analyze this real estate listing text content and extract ONLY the property information as JSON. Here are the fields you need to extract:

- price: Main listing price as number (remove commas and currency symbols)
- address: Full address string (look for the main property address, usually in headings, titles, or prominent text)
- propertyType: Type like "Single Family", "Multi-Family", "Duplex", "Triplex", "Condo", "Apartment", etc.
- bedrooms: Total bedrooms as number (add "3 + 1" = 4)
- bathrooms: Bathrooms as number (can be decimal)
- sqft: Square footage as number (null if not available)
- propertyTax: Monthly property tax amount (MUST estimate if not found). If the value is greater than $1000, it is likely a yearly amount and MUST be divided by 12 to get the monthly amount
- insurance: Monthly insurance amount (MUST estimate if not found)
- hoaFees: Monthly HOA/condo fees (MUST estimate if not found)
- monthlyRent: Estimated monthly rent based on property price, type, and characteristics (MUST estimate)
- interestRate: Estimated current mortgage interest rate (MUST estimate) 

CRITICAL: 
1. Return ONLY valid JSON, no code, no explanations, no other text
2. You MUST analyze the provided real estate data provided below
3. Do NOT return example data - extract real data from the HTML
4. ALWAYS try to extract actual data first - ONLY estimate if data is completely unavailable
5. CRITICAL: You MUST estimate propertyTax, insurance, hoaFees, monthlyRent, and interestRate if not found in content - NEVER return null for these fields

PRICE EXTRACTION RULES:
- Look for the MAIN listing price, usually the largest/most prominent price on the page
- Ignore any prices that are clearly not the main listing price 
- Remove all commas and currency symbols, return only the number
- If you see multiple prices, choose the one that appears to be the main listing price

ADDRESS EXTRACTION RULES:
- Page titles containing addresses
- Headings (h1, h2, h3) with addresses
- Text near "Address" labels
- Prominent text that looks like a street address

PROPERTY TAX EXTRACTION:
- Look for: 'property tax', 'taxes', 'annual tax', 'tax assessment', 'tax rate', 'property taxes', 'tax'
- Common locations: property details, cost breakdown, listing facts, property information
- Search thoroughly in ALL text content before giving up
- If yearly amount: divide by 12 for monthly
- If monthly amount: use as is
- If not found: return null

INSURANCE EXTRACTION:
- Look for: 'home insurance', 'property insurance', 'homeowners insurance', 'insurance estimate', 'insurance cost'
- Search thoroughly in ALL text content before giving up
- If yearly: divide by 12, if monthly: use as is
- If not found: return null

HOA/CONDO FEES EXTRACTION:
- Look for: 'HOA', 'condo fee', 'maintenance fee', 'strata fee', 'common charges', 'monthly maintenance'
- Search thoroughly in ALL text content before giving up
- Usually already monthly, but verify the time period
- If not found: return null

IMPORTANT EXTRACTION RULES:
1. Always check if amounts are 'per year', 'annually', 'yearly' - if so, divide by 12
2. Look for '/month', 'monthly', 'per month' indicators
3. Return actual numbers only (no currency symbols)
4. Search thoroughly in all text content, not just obvious labels

ESTIMATION RULES (MANDATORY - You MUST estimate these fields if not found in content):

PROPERTY TAX ESTIMATION:
- Calculate as: (property_price × annual_tax_rate) ÷ 12
- Annual tax rates by property type and value:
  - Single Family homes: 0.8-1.2% (use 1.0% as default)
  - Condos/Apartments: 0.9-1.3% (use 1.1% as default)
  - Townhouses: 0.8-1.1% (use 0.95% as default)
  - Luxury properties (>$1M): 1.0-1.5% (use 1.2% as default)
  - Lower-value properties (<$300K): 0.6-1.0% (use 0.8% as default)
- General default: 1.0% if property type unclear
- Example: $500,000 single family home = ($500,000 × 0.01) ÷ 12 = $417/month

INSURANCE ESTIMATION:
- Calculate as: (property_price × annual_insurance_rate) ÷ 12
- Annual insurance rates:
  - Properties under $400K: 0.25% of value
  - Properties $400K-$800K: 0.30% of value
  - Properties over $800K: 0.35% of value
  - Add 25% for older homes (pre-1980)
  - Add 15% for high-risk areas (coastal, wildfire zones)
- Example: $500,000 home = ($500,000 × 0.003) ÷ 12 = $125/month

HOA/CONDO FEES ESTIMATION:
- Single Family: $0 (no HOA fees typically)
- Townhouse: $100-300/month based on value:
  - Under $400K: $150
  - $400K-$700K: $200
  - Over $700K: $250
- Condo/Apartment: $200-600/month based on value and amenities:
  - Under $300K: $250
  - $300K-$500K: $350
  - $500K-$800K: $450
  - Over $800K: $550
  - Add $100 for luxury buildings with extensive amenities

MONTHLY RENT ESTIMATION:
- Calculate as: property_price × monthly_rent_ratio
- Base rent ratios by property type (conservative estimates):
  - Single Family: 0.5% of property value
  - Townhouse: 0.6% of property value  
  - Condo 1-2 bed: 0.6% of property value
  - Condo 3+ bed: 0.5% of property value
  - Apartment: 0.7% of property value
  - Multifamily (2-4 units): 0.8% of property value
  - Multifamily (5+ units): 0.9% of property value

QUICK ADJUSTMENTS:
- High-demand/urban areas: -0.2%
- Small towns/rural: +0.2%
- New/renovated (post-2010): +0.1%
- Older properties (pre-1980): -0.1%
- Luxury properties (>$800K): -0.1%

INTEREST RATE ESTIMATION:
- Base rates:
  - US: 6.5%
  - Canada: 4.0%
  - Figure out the country from the address or URL (.ca is canada)
- Adjustments:
  - Properties over $1M: add 0.25%
  - Properties under $300K: subtract 0.25%

 `;

    const response = await fetch(
      `${PROXY_URL}/api/analyze-html`, // Use the Vercel proxy URL
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No Authorization header needed for Vercel proxy
        },
        body: JSON.stringify({
          htmlContent,
          url,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Vercel proxy error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    if (!result.propertyData) {
      return null;
    }

    const aiResponse = result.propertyData;
    console.log("🔍 Raw AI response:", aiResponse);

    // Parse the JSON response
    let propertyData;
    try {
      propertyData = JSON.parse(aiResponse);
      console.log("🔍 Parsed AI JSON:", propertyData);
    } catch (parseError) {
      console.log("❌ Failed to parse AI JSON:", parseError);
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          propertyData = JSON.parse(jsonMatch[0]);
          console.log("🔍 Parsed extracted JSON:", propertyData);
        } catch {
          console.log("❌ Failed to parse extracted JSON");
          return null;
        }
      } else {
        console.log("❌ No JSON found in AI response");
        return null;
      }
    }

    // Add URL to the data
    const finalData: PropertyData = {
      ...propertyData,
      url,
    };

    console.log("🔍 Final property data being returned:", finalData);

    return finalData;
  } catch (error) {
    return null;
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((_details) => {
  // Extension installed or updated
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener(
  (message: ChromeExtensionMessage, _sender, sendResponse) => {
    if (message.type === "ANALYZE_HTML_CONTENT") {
      const { htmlContent, url } = message.data;

      analyzeHtmlContentWithGroq(htmlContent, url)
        .then((propertyData) => {
          sendResponse({ propertyData });
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });

      return true; // Keep message channel open for async response
    }
  }
);

// Removed tab activation listener - no longer needed
