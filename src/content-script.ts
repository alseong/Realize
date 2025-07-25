import type { PropertyData, ChromeExtensionMessage } from "./types/property";

/**
 * Send HTML content to background script for AI analysis
 */
const analyzeHtmlWithAI = async (): Promise<PropertyData | null> => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_HTML_CONTENT",
      data: {
        htmlContent: document.documentElement.outerHTML,
        url: window.location.href,
        timestamp: Date.now(),
        pageIdentifier: `${window.location.href}-${Date.now()}`,
      },
    });

    if (response && response.propertyData) {
      return response.propertyData;
    } else if (response && response.error) {
      return null;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

// Removed DOM extraction fallback - AI only approach

/**
 * Extract property data using HTML and AI analysis
 */
const extractPropertyDataWithHtmlAI =
  async (): Promise<PropertyData | null> => {
    try {
      console.log(
        "🔍 Starting comprehensive AI extraction of property data..."
      );

      // Single AI call to extract ALL property data including financial estimates
      const propertyData = await analyzeHtmlWithAI();
      if (!propertyData) {
        console.log("❌ AI analysis failed");
        return null;
      }

      console.log("🔍 Complete AI analysis result:", propertyData);
      return propertyData;
    } catch (error) {
      console.log("❌ AI extraction error:", error);
      return null; // AI failed, return null
    }
  };

/**
 * Check if current page is valid for data extraction
 */
// const isValidPage = (): boolean => {
//   const url = window.location.href;
//   return (
//     !url.startsWith("chrome://") &&
//     !url.startsWith("about:") &&
//     !url.startsWith("moz-extension://") &&
//     !url.startsWith("chrome-extension://")
//   );
// };

/**
 * Initialize the content script
 */
const init = (): void => {
  // Content script initialized
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  (message: ChromeExtensionMessage, _sender, sendResponse) => {
    if (message.type === "GET_PROPERTY_DATA") {
      extractPropertyDataWithHtmlAI()
        .then((propertyData) => {
          sendResponse({ data: propertyData });
        })
        .catch((error) => {
          console.error("Error in extraction:", error);
          sendResponse({ error: error.message });
        });
      return true; // Keep message channel open for async response
    }
  }
);

// Initialize when script loads
init();
