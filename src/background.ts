import type { ChromeExtensionMessage, PropertyData } from "./types/property";

// Store API keys securely (not accessible from content scripts or popup)
const GROQ_API_KEY = "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";

/**
 * Extract clean text content from HTML for AI analysis
 */
const extractCleanText = (htmlContent: string, url: string): string => {
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
};

/**
 * Analyze HTML content using Groq API
 */
const analyzeHtmlContentWithGroq = async (
  htmlContent: string,
  url: string
): Promise<PropertyData | null> => {
  try {
    // Extract clean text content
    const cleanText = extractCleanText(htmlContent, url);
    const maxLength = 8000; // Limit text content for token efficiency
    const truncatedText =
      cleanText.length > maxLength
        ? cleanText.substring(0, maxLength) + "...[truncated]"
        : cleanText;

    const prompt = `You are a data extraction tool. Analyze this real estate listing text content and extract ONLY the property information as JSON.

CRITICAL: 
1. Return ONLY valid JSON, no code, no explanations, no other text
2. You MUST analyze the actual HTML content provided below
3. Do NOT return example data - extract real data from the HTML
4. If you cannot find specific data in the HTML, return null for that field

IMPORTANT PRICE EXTRACTION RULES:
- Look for the MAIN listing price, usually the largest/most prominent price on the page
- Ignore any prices that are clearly not the main listing price 
- Remove all commas and currency symbols, return only the number
- If you see multiple prices, choose the one that appears to be the main listing price. Sometimes there might be related properties, so choose the one that is the main listing price.

PROPERTY TAX EXTRACTION:
- Look for: 'property tax', 'taxes', 'annual tax', 'tax assessment', 'tax rate', 'property taxes', 'tax'
- Common locations: property details, cost breakdown, listing facts, property information
- Search in: data tables, property facts, cost estimates, monthly costs
- Look for numbers near these terms: $X,XXX/year, $X,XXX annually, $X,XXX per year
- If yearly amount: divide by 12 for monthly
- If monthly amount: use as is
- If not found: return null

INSURANCE EXTRACTION:
- Look for: 'home insurance', 'property insurance', 'homeowners insurance', 'insurance estimate', 'insurance cost', 'home insurance cost', 'insurance'
- May be listed as annual or monthly
- Search in: property details, cost breakdown, monthly costs, insurance section
- Look for numbers near these terms: $X,XXX/year, $X,XXX annually, $X,XXX per year, $X,XXX/month
- If yearly: divide by 12
- If monthly: use as is
- If not found: return null

HOA/CONDO FEES EXTRACTION:
- Look for: 'HOA', 'condo fee', 'maintenance fee', 'strata fee', 'common charges', 'monthly maintenance', 'HOA fee', 'condo fees', 'association fee', 'maintenance'
- Usually already monthly, but verify the time period
- Search in: property details, monthly costs, HOA section, condo information
- Look for numbers near these terms: $X,XXX/month, $X,XXX per month, $X,XXX monthly
- If yearly: divide by 12
- If monthly: use as is
- If not found: return null

IMPORTANT RULES:
1. Always check if amounts are 'per year', 'annually', 'yearly' - if so, divide by 12
2. Look for '/month', 'monthly', 'per month' indicators
3. Return actual numbers only (no currency symbols)
4. If a field says something like '$3,600/year' return 300 (3600/12)
6. Search thoroughly in all text content, not just obvious labels
7. Look for amounts near tax/insurance/HOA related text

Extract these fields from the HTML:
- price: Main listing price as number (remove commas and currency symbols)
- address: Full address string (look for the main property address, usually in headings, titles, or prominent text)
- propertyType: Type like "Single Family", "Condo", "Apartment", etc.
- bedrooms: Total bedrooms as number (add "3 + 1" = 4)
- bathrooms: Bathrooms as number (can be decimal)
- sqft: Square footage as number (null if not available)
- propertyTax: Monthly property tax amount (null if not found)
- insurance: Monthly insurance amount (null if not found)
- hoaFees: Monthly HOA/condo fees (null if not found)

IMPORTANT: For the address, look for:
- Page titles containing addresses
- Headings (h1, h2, h3) with addresses
- Text near "Address" labels
- Prominent text that looks like a street address

Text content to analyze:
${truncatedText}`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.0,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Groq API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    if (!result.choices?.[0]?.message?.content) {
      return null;
    }

    const aiResponse = result.choices[0].message.content;

    // Parse the JSON response
    let propertyData;
    try {
      propertyData = JSON.parse(aiResponse);
    } catch (parseError) {
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          propertyData = JSON.parse(jsonMatch[0]);
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }

    // Add URL to the data
    const finalData: PropertyData = {
      ...propertyData,
      url,
    };

    return finalData;
  } catch (error) {
    return null;
  }
};

// Handle extension installation
chrome.runtime.onInstalled.addListener((_details) => {
  // Extension installed or updated
});

/**
 * Analyze property data specifically for financial data (tax, insurance, HOA)
 */
const analyzePropertyDataForFinancials = async (
  inputPropertyData: PropertyData,
  url: string
): Promise<PropertyData | null> => {
  try {
    console.log("🔍 Starting financial data analysis for property:", {
      address: inputPropertyData.address,
      price: inputPropertyData.price,
      propertyType: inputPropertyData.propertyType,
    });
    const prompt = `You are a specialized financial data analysis tool. Analyze the provided property data and estimate the monthly financial costs and interest rate, then return ONLY the financial information as JSON.

CRITICAL: 
1. Return ONLY valid JSON, no code, no explanations, no other text
2. Analyze the provided property data to estimate financial costs and interest rate
3. Use property price, type, location, and characteristics to estimate monthly costs
4. If you cannot estimate specific data, return null for that field
5. Focus ONLY on financial data: monthly rent, property tax, insurance, and interest rate

MONTHLY RENT ESTIMATION:
- Estimate monthly rent based on property price, type, bedrooms, bathrooms, and location
- Use typical rent-to-price ratios for the property type and location
- For single family homes: typically 0.5-1% of property value per month
- For condos: typically 0.6-1.2% of property value per month
- Consider property characteristics (bedrooms, bathrooms, sqft) for more accurate estimates
- Return estimated monthly rent amount
- If cannot estimate: return null

MONTHLY PROPERTY TAX ESTIMATION:
- Estimate monthly property tax based on property price and location
- Use typical property tax rates for the area (usually 0.5-2% of property value annually)
- Common rates: 0.5-1.5% of property value per year, divided by 12 for monthly
- Consider property type and location for more accurate estimates
- Return estimated monthly property tax amount
- If cannot estimate: return null

MONTHLY INSURANCE ESTIMATION:
- Estimate monthly insurance based on property price, type, and location
- Use typical insurance rates for the property type and area
- Common rates: 0.2-0.5% of property value annually, divided by 12 for monthly
- Consider property characteristics and location for more accurate estimates
- Return estimated monthly insurance amount
- If cannot estimate: return null

INTEREST RATE ESTIMATION:
- Estimate current mortgage interest rate based on property price, location, and market conditions
- Consider current market rates (typically 5-7% for conventional mortgages)
- Higher property prices may qualify for better rates
- Consider location (urban vs rural, different provinces may have different rates)
- Property type may affect rates (primary residence vs investment property)
- Return estimated annual interest rate as a percentage (e.g., 6.5 for 6.5%)
- If cannot estimate: return null

IMPORTANT RULES:
1. Use the property price as the primary factor for all estimates
2. Consider property type (single family, condo, townhouse) for different rate adjustments
3. Consider location and property characteristics for more accurate estimates
4. Return actual numbers only (no currency symbols)
5. Be conservative with estimates - it's better to underestimate than overestimate
6. Use typical market rates and ratios for the property type and location
7. For interest rate, consider current market conditions and property characteristics

Extract these fields from property data analysis:
- monthlyRent: Estimated monthly rent amount (null if cannot estimate)
- propertyTax: Estimated monthly property tax amount (null if cannot estimate)
- insurance: Estimated monthly insurance amount (null if cannot estimate)
- interestRate: Estimated annual interest rate as percentage (null if cannot estimate)

Property data to analyze:
${JSON.stringify(inputPropertyData, null, 2)}`;

    console.log("🔍 Making Groq API call for financial data analysis...");

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.0,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Groq API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    if (!result.choices?.[0]?.message?.content) {
      return null;
    }

    const aiResponse = result.choices[0].message.content;

    // Parse the JSON response
    let propertyData;
    try {
      propertyData = JSON.parse(aiResponse);
    } catch (parseError) {
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          propertyData = JSON.parse(jsonMatch[0]);
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }

    // Add URL to the data
    const finalData: PropertyData = {
      ...propertyData,
      url,
    };

    return finalData;
  } catch (error) {
    return null;
  }
};

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

    if (message.type === "ANALYZE_HTML_CONTENT_FINANCIALS") {
      console.log("🔍 Received ANALYZE_HTML_CONTENT_FINANCIALS message");
      const { propertyData, url } = message.data;

      analyzePropertyDataForFinancials(propertyData, url)
        .then((financialData) => {
          console.log("🔍 Financial analysis completed:", financialData);
          sendResponse({ propertyData: financialData });
        })
        .catch((error: any) => {
          console.log("❌ Financial analysis failed:", error);
          sendResponse({ error: error.message });
        });

      return true; // Keep message channel open for async response
    }
  }
);

// Removed tab activation listener - no longer needed
