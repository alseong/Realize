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
      // Analyze HTML content with AI via background script
      const propertyData = await analyzeHtmlWithAI();
      if (!propertyData) {
        return null; // AI failed, return null
      }

      // Check if we need to make additional API calls for missing values
      const needsAdditionalAnalysis =
        !propertyData.propertyTax &&
        !propertyData.insurance &&
        !propertyData.monthlyRent;

      console.log("🔍 Financial data check:", {
        propertyTax: propertyData.propertyTax,
        insurance: propertyData.insurance,
        monthlyRent: propertyData.monthlyRent,
        needsAdditionalAnalysis,
      });

      if (needsAdditionalAnalysis) {
        console.log(
          "🔍 Missing tax/insurance/HOA data, making additional API call..."
        );

        // Make an additional API call specifically for missing financial data
        const additionalData = await analyzeHtmlWithAIForFinancials(
          propertyData
        );
        console.log("🔍 Additional financial analysis result:", additionalData);

        if (additionalData) {
          // Merge the additional data with the original data
          const mergedData = {
            ...propertyData,
            propertyTax: additionalData.propertyTax || propertyData.propertyTax,
            insurance: additionalData.insurance || propertyData.insurance,
            monthlyRent: additionalData.monthlyRent || propertyData.monthlyRent,
          };
          console.log(
            "🔍 Merged property data with financial data:",
            mergedData
          );
          return mergedData;
        }
      } else {
        console.log(
          "✅ All financial data already present, skipping additional analysis"
        );
      }

      return propertyData;
    } catch (error) {
      return null; // AI failed, return null
    }
  };

/**
 * Make an additional AI analysis call specifically for financial data
 */
const analyzeHtmlWithAIForFinancials = async (
  existingData: PropertyData
): Promise<PropertyData | null> => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_HTML_CONTENT_FINANCIALS",
      data: {
        htmlContent: document.documentElement.outerHTML,
        propertyData: existingData,
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
