import type { ChromeExtensionMessage, PropertyData } from "./types/property";

// Use Vercel proxy to keep API keys secure
const PROXY_URL = "https://realize.vercel.app";

/**
 * Analyze HTML content using Groq API!
 */
async function analyzeHtmlContentWithGroq(
  htmlContent: string,
  url: string
): Promise<PropertyData | null> {
  try {
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
