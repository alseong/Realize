import type { PropertyData, ChromeExtensionMessage } from "./types/property";

// Build version identifier for verification
const BUILD_VERSION = "v4.0.0 - Universal AI Analysis";
console.log(`🏠 Realtor.ca Cashflow Extension loaded - ${BUILD_VERSION}`);
console.log("📅 Build timestamp:", new Date().toISOString());

/**
 * Capture full page screenshot by scrolling and stitching (invisible to user)
 */
const captureFullPageScreenshot = async (): Promise<string | null> => {
  try {
    console.log("📸 Starting silent full page screenshot capture...");

    // Save original scroll position
    const originalScrollTop =
      window.pageYOffset || document.documentElement.scrollTop;
    const originalScrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    // Get page dimensions
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    console.log(
      `📏 Page dimensions: ${viewportWidth}x${documentHeight}, viewport: ${viewportWidth}x${viewportHeight}`
    );

    // If page fits in one viewport, use simple capture
    if (documentHeight <= viewportHeight) {
      console.log("📸 Page fits in viewport, using simple capture");
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "CAPTURE_SCREENSHOT" },
          (response) => {
            if (response?.dataUrl) {
              resolve(response.dataUrl);
            } else {
              console.error("❌ Screenshot capture failed:", response?.error);
              resolve(null);
            }
          }
        );
      });
    }

    // For long pages, capture multiple sections and stitch them
    console.log("📸 Long page detected, capturing in sections...");

    const capturedSections: string[] = [];
    const sectionsToCapture = Math.min(
      Math.ceil(documentHeight / viewportHeight),
      5
    ); // Limit to 5 sections max

    console.log(`📸 Will capture ${sectionsToCapture} sections`);

    // Disable smooth scrolling temporarily for instant positioning
    const originalScrollBehavior =
      document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";

    for (let i = 0; i < sectionsToCapture; i++) {
      const scrollTop = Math.min(
        i * viewportHeight,
        documentHeight - viewportHeight
      );

      console.log(
        `📸 Capturing section ${
          i + 1
        }/${sectionsToCapture} at scroll position ${scrollTop}`
      );

      // Scroll to position (instantly)
      window.scrollTo(0, scrollTop);

      // Small delay to ensure rendering
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture this section
      const sectionImage = await new Promise<string | null>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "CAPTURE_SCREENSHOT" },
          (response) => {
            if (response?.dataUrl) {
              resolve(response.dataUrl);
            } else {
              console.error(
                `❌ Failed to capture section ${i + 1}:`,
                response?.error
              );
              resolve(null);
            }
          }
        );
      });

      if (sectionImage) {
        capturedSections.push(sectionImage);
      }
    }

    // Restore original scroll behavior and position
    document.documentElement.style.scrollBehavior = originalScrollBehavior;
    window.scrollTo(originalScrollLeft, originalScrollTop);

    console.log(
      `📸 Captured ${capturedSections.length} sections, using first section for analysis`
    );

    // For now, return the first section (which contains the most important info)
    // In the future, we could stitch all sections together
    if (capturedSections.length > 0) {
      console.log("✅ Full page screenshot capture completed");
      return capturedSections[0]; // Return the top section which has price, address, etc.
    } else {
      console.error("❌ No sections were captured successfully");
      return null;
    }
  } catch (error) {
    console.error("❌ Error in full page screenshot capture:", error);
    // Restore scroll position on error
    try {
      const originalScrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const originalScrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;
      window.scrollTo(originalScrollLeft, originalScrollTop);
    } catch (restoreError) {
      console.error("❌ Error restoring scroll position:", restoreError);
    }
    return null;
  }
};

/**
 * Send screenshot to background script for AI analysis
 */
const analyzeScreenshotWithAI = async (
  screenshotDataUrl: string
): Promise<PropertyData | null> => {
  try {
    console.log(
      "🤖 Sending screenshot to background script for AI analysis..."
    );

    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_SCREENSHOT",
      data: {
        screenshotDataUrl,
        url: window.location.href,
      },
    });

    console.log("🤖 Screenshot AI analysis response received:", response);

    if (response && response.propertyData) {
      console.log(
        "✅ Screenshot AI analysis completed:",
        response.propertyData
      );
      return response.propertyData;
    } else if (response && response.error) {
      console.error(
        "❌ Screenshot AI analysis error from background:",
        response.error
      );
      return null;
    } else {
      console.error(
        "❌ Failed to analyze screenshot with AI - unexpected response:",
        response
      );
      return null;
    }
  } catch (error) {
    console.error("❌ Error analyzing screenshot with AI:", error);
    if (error instanceof Error) {
      console.error("❌ Error details:", error.name, error.message);
    }
    return null;
  }
};

/**
 * Fallback: Extract generic data using DOM selectors (when AI is unavailable)
 */
const extractPropertyDataWithDOM = (): PropertyData | null => {
  try {
    console.log("🔧 Using universal DOM extraction...");

    const url = window.location.href;
    const pageTitle = document.title;

    // Try to extract any price-like numbers from the page
    const pageText = document.body.innerText;
    const priceMatches = pageText.match(/\$[\d,]+/g);
    let price = 0;

    if (priceMatches) {
      // Take the largest price found (likely the main price)
      const prices = priceMatches.map((p) => parseInt(p.replace(/[$,]/g, "")));
      price = Math.max(...prices);
    }
    console.log("💰 Extracted price:", price);

    // Use page title or URL as address fallback
    let address = pageTitle;

    // Try common address selectors
    const addressSelectors = [
      '[data-testid*="address"]',
      ".address",
      '[class*="address"]',
      "h1",
      '[data-cy*="address"]',
    ];

    for (const selector of addressSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        address = element.textContent.trim();
        break;
      }
    }
    console.log("🏠 Extracted address:", address);

    // Generic property type from URL or page content
    let propertyType = "Property";
    if (url.includes("condo")) propertyType = "Condo";
    else if (url.includes("house")) propertyType = "House";
    else if (url.includes("apartment")) propertyType = "Apartment";
    else if (url.includes("townhouse")) propertyType = "Townhouse";

    console.log("🏘️ Extracted property type:", propertyType);

    // Try to find bedroom/bathroom info in text
    const bedroomMatch = pageText.match(/(\d+)[\s\-]*(?:bed|br|bedroom)/i);
    const bedrooms = bedroomMatch ? parseInt(bedroomMatch[1]) : undefined;
    console.log("🛏️ Extracted bedrooms:", bedrooms);

    const bathroomMatch = pageText.match(
      /(\d+(?:\.\d+)?)[\s\-]*(?:bath|bathroom)/i
    );
    const bathrooms = bathroomMatch ? parseFloat(bathroomMatch[1]) : undefined;
    console.log("🚿 Extracted bathrooms:", bathrooms);

    // Try to find square footage
    const sqftMatch = pageText.match(
      /(\d+,?\d*)[\s\-]*(?:sq\.?\s*ft|sqft|square feet)/i
    );
    const sqft = sqftMatch
      ? parseInt(sqftMatch[1].replace(/,/g, ""))
      : undefined;
    console.log("📐 Extracted sqft:", sqft);

    const propertyData: PropertyData = {
      price,
      address,
      propertyType,
      bedrooms,
      bathrooms,
      sqft,
      url,
      listingId: undefined,
    };

    console.log("✅ Universal DOM extraction completed:", propertyData);
    return propertyData;
  } catch (error) {
    console.error("❌ Error in universal DOM extraction:", error);
    return null;
  }
};

/**
 * Extract property data using screenshot and AI analysis
 */
const extractPropertyDataWithScreenshotAI =
  async (): Promise<PropertyData | null> => {
    console.log(
      "🚀 Starting Screenshot AI-powered property data extraction..."
    );

    try {
      // Step 1: Capture full page screenshot
      const screenshotDataUrl = await captureFullPageScreenshot();
      if (!screenshotDataUrl) {
        console.error("❌ Failed to capture screenshot");
        return null;
      }

      // Step 2: Analyze screenshot with AI via background script
      const propertyData = await analyzeScreenshotWithAI(screenshotDataUrl);
      if (!propertyData) {
        console.log("⚠️ Screenshot AI analysis failed, trying DOM fallback...");
        return extractPropertyDataWithDOM();
      }

      console.log(
        "✅ Successfully extracted property data with Screenshot AI:",
        propertyData
      );
      return propertyData;
    } catch (error) {
      console.error("❌ Error in Screenshot AI extraction process:", error);
      console.log("⚠️ Falling back to DOM extraction...");
      return extractPropertyDataWithDOM();
    }
  };

/**
 * Check if current page is valid for data extraction
 */
const isValidPage = (): boolean => {
  const url = window.location.href;
  // Allow any webpage that's not chrome:// or about: pages
  const isValid =
    !url.startsWith("chrome://") &&
    !url.startsWith("about:") &&
    !url.startsWith("moz-extension://") &&
    !url.startsWith("chrome-extension://");
  console.log("🔍 Checking if valid page for extraction:", url, "->", isValid);
  return isValid;
};

/**
 * Initialize the content script
 */
const init = (): void => {
  console.log("🚀 Initializing universal AI content script...");
  console.log("📄 Document ready state:", document.readyState);
  console.log("🌐 Current URL:", window.location.href);

  if (isValidPage()) {
    console.log("✅ Valid page for AI extraction");
  } else {
    console.log(
      "⚠️ Not a valid page for extraction (chrome:// or about: page)"
    );
  }
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  (message: ChromeExtensionMessage, _sender, sendResponse) => {
    console.log("📩 Received message from popup:", message);

    if (message.type === "GET_PROPERTY_DATA") {
      console.log(
        "🔍 Popup requested property data, starting screenshot AI extraction..."
      );
      extractPropertyDataWithScreenshotAI().then((propertyData) => {
        console.log(
          "📤 Sending screenshot AI-extracted property data to popup:",
          propertyData
        );
        sendResponse({ data: propertyData });
      });
      return true; // Keep message channel open for async response
    }
  }
);

// Initialize when script loads
console.log("🎯 Screenshot AI-powered content script loaded, calling init...");
init();
