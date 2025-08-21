import type { PropertyData, ChromeExtensionMessage } from "./types/property";

/**
 * Send HTML content to background script for AI analysis
 */
const analyzeHtmlWithAI = async (): Promise<PropertyData | null> => {
  try {
    console.log(
      "🤖 Content script: Sending HTML to background for AI analysis..."
    );

    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_HTML_CONTENT",
      data: {
        htmlContent: document.documentElement.outerHTML,
        url: window.location.href,
        timestamp: Date.now(),
        pageIdentifier: `${window.location.href}-${Date.now()}`,
      },
    });

    console.log("🤖 Content script: Received AI analysis response:", response);

    if (response && response.propertyData) {
      console.log(
        "✅ Content script: AI analysis successful:",
        response.propertyData
      );
      return response.propertyData;
    } else if (response && response.error) {
      console.error("❌ Content script: AI analysis error:", response.error);
      return null;
    } else {
      console.warn("⚠️ Content script: No property data in AI response");
      return null;
    }
  } catch (error) {
    console.error("❌ Content script: Exception during AI analysis:", error);
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
  console.log("🚀 Content script initialized on:", window.location.href);
  console.log("🚀 Content script DOM ready state:", document.readyState);
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  (message: ChromeExtensionMessage, _sender, sendResponse) => {
    console.log("📨 Content script received message:", message.type);

    if (message.type === "GET_PROPERTY_DATA") {
      console.log("🔍 Content script: Starting property data extraction...");

      // Send immediate acknowledgment
      console.log("📤 Content script: Sending acknowledgment to popup");

      extractPropertyDataWithHtmlAI()
        .then((propertyData) => {
          console.log(
            "✅ Content script: Property data extracted:",
            propertyData
          );
          sendResponse({ data: propertyData });
        })
        .catch((error) => {
          console.error("❌ Content script: Error in extraction:", error);
          sendResponse({ error: error.message });
        });
      return true; // Keep message channel open for async response
    }

    // Add a test message type for debugging
    if (message.type === "TEST_CONNECTION") {
      console.log("🧪 Content script: Test connection received");
      sendResponse({ success: true, message: "Content script is working!" });
      return true;
    }

    console.log("⚠️ Content script: Unknown message type:", message.type);
    return false;
  }
);

// Test immediate message listener setup
console.log("🔧 Content script: Setting up message listener...");

// Also try alternative listener setup approach
if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  console.log("✅ Content script: Chrome runtime available");
} else {
  console.error("❌ Content script: Chrome runtime NOT available");
}

// Initialize when script loads
init();

// Send a ping to background to confirm content script is loaded
setTimeout(() => {
  try {
    chrome.runtime
      .sendMessage({
        type: "CONTENT_SCRIPT_LOADED",
        data: { url: window.location.href },
      })
      .then(() => console.log("✅ Content script ping sent"))
      .catch((error) => console.error("❌ Content script ping failed:", error));
  } catch (error) {
    console.error("❌ Chrome runtime not available:", error);
  }
}, 500);

// Also ensure initialization after DOM is fully ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  // DOM already loaded
  setTimeout(init, 100);
}
