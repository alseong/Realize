import type { ChromeExtensionMessage, PropertyData } from "./types/property";

const BUILD_VERSION = "v3.1.0 - Dual AI Background (Groq + OpenAI)";
console.log(`🏠 Background script loaded - ${BUILD_VERSION}`);

// Store API keys securely (not accessible from content scripts or popup)
const GROQ_API_KEY = "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";
const OPENAI_API_KEY = "sk-your-openai-api-key-here"; // Replace with your actual OpenAI API key

/**
 * Extract relevant sections from HTML for AI analysis
 */
const extractRelevantHtmlSections = (htmlContent: string): string => {
  try {
    // Create a temporary DOM to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Extract only the most relevant sections for property data
    const relevantSections = [];

    // Price section
    const priceElement = doc.querySelector(
      '#listingPrice, #listingPriceValue, [class*="price"]'
    );
    if (priceElement) {
      relevantSections.push(
        `<div class="price-section">${priceElement.outerHTML}</div>`
      );
    }

    // Address section
    const addressElement = doc.querySelector(
      '#listingAddress, [class*="address"]'
    );
    if (addressElement) {
      relevantSections.push(
        `<div class="address-section">${addressElement.outerHTML}</div>`
      );
    }

    // Property details section
    const detailsSection = doc.querySelector(
      '#listingDetailsTabsBody, #PropertySummary, [class*="property-details"]'
    );
    if (detailsSection) {
      relevantSections.push(
        `<div class="details-section">${detailsSection.outerHTML}</div>`
      );
    }

    // Icons section (bedrooms, bathrooms, sqft)
    const iconsSection = doc.querySelector(
      '.listingIconsCon, [class*="listing-icons"]'
    );
    if (iconsSection) {
      relevantSections.push(
        `<div class="icons-section">${iconsSection.outerHTML}</div>`
      );
    }

    // Building details
    const buildingSection = doc.querySelector(
      '#listingDetailsBuildingCon, [class*="building"]'
    );
    if (buildingSection) {
      relevantSections.push(
        `<div class="building-section">${buildingSection.outerHTML}</div>`
      );
    }

    const extractedHtml = `<html><body>${relevantSections.join(
      "\n"
    )}</body></html>`;
    console.log(
      "📄 Extracted relevant HTML sections, length:",
      extractedHtml.length
    );

    return extractedHtml;
  } catch (error) {
    console.log("⚠️ Failed to extract relevant sections, using original HTML");
    return htmlContent;
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
    console.log("🤖 Sending HTML content to Groq API...");
    console.log("📄 Original HTML content length:", htmlContent.length);
    console.log("📍 URL:", url);

    // First, extract only relevant sections
    const relevantHtml = extractRelevantHtmlSections(htmlContent);

    // Then truncate if still too long
    const maxLength = 15000; // Much smaller limit for Groq free tier
    const truncatedHtml =
      relevantHtml.length > maxLength
        ? relevantHtml.substring(0, maxLength) + "...[truncated]"
        : relevantHtml;

    console.log("📄 Final HTML length for API:", truncatedHtml.length);
    console.log(
      "📄 HTML preview (first 1000 chars):",
      truncatedHtml.substring(0, 1000)
    );

    const prompt = `You are a data extraction tool. Analyze this real estate listing HTML and extract ONLY the property information as JSON.

CRITICAL: Return ONLY valid JSON, no code, no explanations, no other text.

Extract these fields from the HTML:
- price: Dollar amount as number (e.g., 649900)
- address: Full address string
- propertyType: Type like "Single Family", "Condo", etc.
- bedrooms: Total bedrooms as number (add "3 + 1" = 4)
- bathrooms: Bathrooms as number (can be decimal)
- sqft: Square footage as number (null if not available)

Expected JSON format:
{"price": 649900, "address": "123 Main St, City, Province", "propertyType": "Single Family", "bedrooms": 4, "bathrooms": 2, "sqft": 1500}

HTML to analyze:
${truncatedHtml}`;

    console.log("🤖 Making Groq API call...");

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
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 300,
          temperature: 0.1,
        }),
      }
    );

    console.log(
      "🤖 Groq response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Groq API error response:", errorText);
      throw new Error(
        `Groq API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("🤖 Groq full response:", result);

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error("❌ Invalid Groq response structure:", result);
      return null;
    }

    const aiResponse = result.choices[0].message.content;
    console.log("🤖 AI raw analysis result:", aiResponse);

    if (!aiResponse) {
      console.error("❌ Empty AI response content");
      return null;
    }

    // Parse the JSON response
    let propertyData;
    try {
      propertyData = JSON.parse(aiResponse);
      console.log("✅ Successfully parsed JSON:", propertyData);
    } catch (parseError) {
      console.error("❌ Failed to parse AI response as JSON:", parseError);
      console.error("❌ Raw AI response was:", aiResponse);

      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          propertyData = JSON.parse(jsonMatch[0]);
          console.log(
            "✅ Successfully extracted and parsed JSON from wrapped response:",
            propertyData
          );
        } catch (secondParseError) {
          console.error("❌ Failed to parse extracted JSON:", secondParseError);
          return null;
        }
      } else {
        return null;
      }
    }

    // Add URL and listing ID
    const listingIdMatch = url.match(/\/(\d+)(?:\/|$)/);

    const finalData: PropertyData = {
      ...propertyData,
      url,
      listingId: listingIdMatch ? listingIdMatch[1] : undefined,
    };

    console.log("✅ Final parsed property data:", finalData);
    return finalData;
  } catch (error) {
    console.error("❌ Error with Groq API - full error:", error);
    if (error instanceof Error) {
      console.error("❌ Error name:", error.name);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
    }
    return null;
  }
};

/**
 * Analyze screenshot using OpenAI Vision API
 */
const analyzeScreenshotWithOpenAI = async (
  screenshotDataUrl: string,
  url: string
): Promise<PropertyData | null> => {
  try {
    console.log("🤖 Sending screenshot to OpenAI Vision API...");

    // Check if OpenAI API key is configured
    if (OPENAI_API_KEY === "sk-your-openai-api-key-here" || !OPENAI_API_KEY) {
      console.error(
        "❌ OpenAI API key not configured. Please update OPENAI_API_KEY in background.ts"
      );
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `Analyze this real estate listing screenshot from Realtor.ca and extract the following information in JSON format:

IMPORTANT: Look carefully at the page for these specific elements:
- Price: Usually displayed prominently at the top (like $649,900)
- Address: Full property address 
- Property Type: Look for "Single Family", "Condo", "Townhouse", etc.
- Bedrooms: Total number (if you see "3 + 1" format, add them together = 4)
- Bathrooms: Number of bathrooms (can be decimal like 2.5)
- Square Footage: Size in square feet (if shows "-" or not visible, use null)

Return ONLY valid JSON in this exact format (no other text):
{
  "price": 649900,
  "address": "123 Main St, City, Province",
  "propertyType": "Single Family",
  "bedrooms": 4,
  "bathrooms": 2,
  "sqft": 1500
}

If any field is not visible or unavailable, use null for that field.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`, // Use proper OpenAI API key
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: screenshotDataUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    console.log(
      "🤖 OpenAI response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenAI API error response:", errorText);
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("🤖 OpenAI full response:", result);

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error("❌ Invalid OpenAI response structure:", result);
      return null;
    }

    const aiResponse = result.choices[0].message.content;
    console.log("🤖 OpenAI raw analysis result:", aiResponse);

    if (!aiResponse) {
      console.error("❌ Empty OpenAI response content");
      return null;
    }

    // Parse the JSON response
    let propertyData;
    try {
      propertyData = JSON.parse(aiResponse);
      console.log("✅ Successfully parsed JSON:", propertyData);
    } catch (parseError) {
      console.error("❌ Failed to parse OpenAI response as JSON:", parseError);
      console.error("❌ Raw OpenAI response was:", aiResponse);

      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          propertyData = JSON.parse(jsonMatch[0]);
          console.log(
            "✅ Successfully extracted and parsed JSON from wrapped response:",
            propertyData
          );
        } catch (secondParseError) {
          console.error("❌ Failed to parse extracted JSON:", secondParseError);
          return null;
        }
      } else {
        return null;
      }
    }

    // Add URL and listing ID
    const listingIdMatch = url.match(/\/(\d+)(?:\/|$)/);

    const finalData: PropertyData = {
      ...propertyData,
      url,
      listingId: listingIdMatch ? listingIdMatch[1] : undefined,
    };

    console.log("✅ Final parsed property data:", finalData);
    return finalData;
  } catch (error) {
    console.error("❌ Error with OpenAI Vision API - full error:", error);
    if (error instanceof Error) {
      console.error("❌ Error name:", error.name);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
    }
    return null;
  }
};

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("🚀 Extension installed:", details.reason);

  if (details.reason === "install") {
    console.log("✅ First time installation");
  } else if (details.reason === "update") {
    console.log("🔄 Extension updated");
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener(
  (message: ChromeExtensionMessage, sender, sendResponse) => {
    console.log("📩 Background received message:", message, "from:", sender);

    if (message.type === "CAPTURE_SCREENSHOT") {
      console.log("📸 Handling screenshot capture request...");
      console.log("📍 Sender tab info:", sender.tab);

      // For Manifest V3, capture visible tab with current window (simpler approach)
      try {
        chrome.tabs.captureVisibleTab(
          { format: "png", quality: 90 },
          (dataUrl) => {
            if (chrome.runtime.lastError) {
              console.error(
                "❌ Screenshot capture error:",
                chrome.runtime.lastError
              );
              console.error(
                "❌ Error message:",
                chrome.runtime.lastError.message
              );

              // Try alternative approach if first method fails
              if (sender.tab && sender.tab.windowId) {
                console.log(
                  "🔄 Trying alternative method with sender tab window..."
                );
                chrome.tabs.captureVisibleTab(
                  sender.tab.windowId,
                  { format: "png", quality: 90 },
                  (dataUrl2) => {
                    if (chrome.runtime.lastError) {
                      console.error(
                        "❌ Alternative method also failed:",
                        chrome.runtime.lastError.message
                      );
                      sendResponse({ error: chrome.runtime.lastError.message });
                    } else {
                      console.log(
                        "✅ Alternative method succeeded, data length:",
                        dataUrl2 ? dataUrl2.length : 0
                      );
                      sendResponse({ dataUrl: dataUrl2 });
                    }
                  }
                );
              } else {
                sendResponse({ error: chrome.runtime.lastError.message });
              }
            } else {
              console.log(
                "✅ Screenshot captured successfully, data length:",
                dataUrl ? dataUrl.length : 0
              );
              sendResponse({ dataUrl });
            }
          }
        );
      } catch (error) {
        console.error("❌ Exception during screenshot capture:", error);
        sendResponse({ error: "Screenshot capture failed: " + error });
      }

      return true; // Keep message channel open for async response
    }

    if (message.type === "ANALYZE_HTML_CONTENT") {
      console.log("🤖 Handling HTML content AI analysis request...");

      const { htmlContent, url } = message.data;

      analyzeHtmlContentWithGroq(htmlContent, url) // Changed to analyzeHtmlContentWithGroq
        .then((propertyData) => {
          console.log("📤 Sending analysis result back:", propertyData);
          sendResponse({ propertyData });
        })
        .catch((error) => {
          console.error("❌ Analysis error:", error);
          sendResponse({ error: error.message });
        });

      return true; // Keep message channel open for async response
    }

    if (message.type === "ANALYZE_SCREENSHOT") {
      console.log("🤖 Handling AI analysis request...");

      const { screenshotDataUrl, url } = message.data;

      analyzeScreenshotWithOpenAI(screenshotDataUrl, url) // Changed to analyzeScreenshotWithOpenAI
        .then((propertyData) => {
          console.log("📤 Sending analysis result back:", propertyData);
          sendResponse({ propertyData });
        })
        .catch((error) => {
          console.error("❌ Analysis error:", error);
          sendResponse({ error: error.message });
        });

      return true; // Keep message channel open for async response
    }

    if (message.type === "PROPERTY_DATA") {
      console.log("📊 Property data received:", message.data);
      // Could store data or trigger notifications here
    }
  }
);

// Handle tab updates
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes("realtor.ca")) {
    console.log("🔄 Realtor.ca page loaded:", tab.url);
  }
});

console.log("✅ Background script initialized");
