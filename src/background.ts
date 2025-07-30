import type { ChromeExtensionMessage, PropertyData } from "./types/property";

// Use Vercel proxy to keep API keys secure
const PROXY_URL = "https://realize.vercel.app";

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
