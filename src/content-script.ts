import type { PropertyData, ChromeExtensionMessage } from "./types/property";

// Build version identifier for verification
const BUILD_VERSION = "v3.1.0 - Groq AI Analysis";
console.log(`🏠 Realtor.ca Cashflow Extension loaded - ${BUILD_VERSION}`);
console.log("📅 Build timestamp:", new Date().toISOString());

/**
 * Extract full page HTML content for AI analysis (no visual disruption)
 */
const extractPageContent = (): string => {
  try {
    console.log("📄 Extracting page content...");

    // Get the full HTML content
    const htmlContent = document.documentElement.outerHTML;

    console.log("📄 HTML content length:", htmlContent.length);
    console.log("📍 Current URL:", window.location.href);

    return htmlContent;
  } catch (error) {
    console.error("❌ Error extracting page content:", error);
    return "";
  }
};

/**
 * Send page content to background script for AI analysis
 */
const analyzePageContentWithAI = async (
  htmlContent: string
): Promise<PropertyData | null> => {
  try {
    console.log(
      "🤖 Sending page content to background script for AI analysis..."
    );
    console.log(
      "📄 HTML content preview (first 500 chars):",
      htmlContent.substring(0, 500)
    );

    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_HTML_CONTENT",
      data: {
        htmlContent,
        url: window.location.href,
      },
    });

    console.log("🤖 AI analysis response received:", response);

    if (response && response.propertyData) {
      console.log("✅ AI analysis completed:", response.propertyData);
      return response.propertyData;
    } else if (response && response.error) {
      console.error("❌ AI analysis error from background:", response.error);
      return null;
    } else {
      console.error(
        "❌ Failed to analyze page content with AI - unexpected response:",
        response
      );
      return null;
    }
  } catch (error) {
    console.error("❌ Error analyzing page content with AI:", error);
    if (error instanceof Error) {
      console.error("❌ Error details:", error.name, error.message);
    }
    return null;
  }
};

/**
 * Fallback: Extract property data using DOM selectors (when AI is unavailable)
 */
const extractPropertyDataWithDOM = (): PropertyData | null => {
  try {
    console.log("🔧 Using DOM fallback extraction...");

    // Extract price
    const priceElement = document.querySelector("#listingPriceValue");
    const priceText = priceElement?.textContent || "";
    const priceMatch = priceText.match(/\$?([\d,]+)/);
    const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, "")) : 0;
    console.log("💰 Extracted price:", price);

    // Extract address
    const addressElement = document.querySelector("#listingAddress");
    const address =
      addressElement?.textContent?.trim().replace(/\s+/g, " ") ||
      "Address not found";
    console.log("🏠 Extracted address:", address);

    // Extract property type
    const propertyTypeElement =
      document.querySelector(
        "#propertyDetailsSectionContentSubCon_PropertyType .propertyDetailsSectionContentValue"
      ) ||
      document.querySelector(
        "#propertyDetailsSectionContentSubCon_BuildingType .propertyDetailsSectionContentValue"
      );
    const propertyType = propertyTypeElement?.textContent?.trim() || "Property";
    console.log("🏘️ Extracted property type:", propertyType);

    // Extract bedrooms
    const bedroomsElement = document.querySelector(
      "#BedroomIcon .listingIconNum"
    );
    const bedroomsText = bedroomsElement?.textContent || "";
    const bedroomsMatch = bedroomsText.match(/(\d+)(?:\s*\+\s*(\d+))?/);
    let bedrooms: number | undefined;
    if (bedroomsMatch) {
      const mainBeds = parseInt(bedroomsMatch[1]);
      const additionalBeds = bedroomsMatch[2] ? parseInt(bedroomsMatch[2]) : 0;
      bedrooms = mainBeds + additionalBeds;
    }
    console.log("🛏️ Extracted bedrooms:", bedrooms);

    // Extract bathrooms
    const bathroomsElement = document.querySelector(
      "#BathroomIcon .listingIconNum"
    );
    const bathroomsText = bathroomsElement?.textContent || "";
    const bathroomsMatch = bathroomsText.match(/(\d+(?:\.\d+)?)/);
    const bathrooms = bathroomsMatch
      ? parseFloat(bathroomsMatch[1])
      : undefined;
    console.log("🚿 Extracted bathrooms:", bathrooms);

    // Extract square footage
    const sqftElement = document.querySelector(
      "#SquareFootageIcon .listingIconNum"
    );
    const sqftText = sqftElement?.textContent || "";
    let sqft: number | undefined;
    if (sqftText && sqftText.trim() !== "-") {
      const sqftMatch = sqftText.match(/([\d,]+)/);
      sqft = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, "")) : undefined;
    }
    console.log("📐 Extracted sqft:", sqft);

    // Get URL and listing ID
    const url = window.location.href;
    const listingIdMatch = url.match(/\/(\d+)(?:\/|$)/);
    const listingId = listingIdMatch ? listingIdMatch[1] : undefined;

    const propertyData: PropertyData = {
      price,
      address,
      propertyType,
      bedrooms,
      bathrooms,
      sqft,
      url,
      listingId,
    };

    console.log("✅ DOM fallback extraction completed:", propertyData);
    return propertyData;
  } catch (error) {
    console.error("❌ Error in DOM fallback extraction:", error);
    return null;
  }
};

/**
 * Extract property data using HTML content and AI analysis
 */
const extractPropertyDataWithAI = async (): Promise<PropertyData | null> => {
  console.log("🚀 Starting AI-powered property data extraction...");

  try {
    // Step 1: Extract page HTML content (no visual disruption)
    const htmlContent = extractPageContent();
    if (!htmlContent) {
      console.error("❌ Failed to extract page content");
      return null;
    }

    // Step 2: Analyze with AI via background script
    const propertyData = await analyzePageContentWithAI(htmlContent);
    if (!propertyData) {
      console.log("⚠️ AI analysis failed, trying DOM fallback...");
      return extractPropertyDataWithDOM();
    }

    console.log(
      "✅ Successfully extracted property data with AI:",
      propertyData
    );
    return propertyData;
  } catch (error) {
    console.error("❌ Error in AI extraction process:", error);
    console.log("⚠️ Falling back to DOM extraction...");
    return extractPropertyDataWithDOM();
  }
};

/**
 * Create and inject the cashflow calculator button
 */
const createCalculatorButton = (): void => {
  console.log("🔧 Creating calculator button...");

  // Check if button already exists
  if (document.getElementById("realtor-cashflow-btn")) {
    console.log("⚠️ Button already exists, skipping creation");
    return;
  }

  const button = document.createElement("button");
  button.id = "realtor-cashflow-btn";
  button.textContent = "🤖 AI Extract Data";
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: #2196F3;
    color: white;
    border: none;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    transition: all 0.2s ease;
  `;

  // Add hover effect
  button.addEventListener("mouseenter", () => {
    button.style.background = "#1976D2";
    button.style.transform = "translateY(-2px)";
    button.style.boxShadow = "0 6px 16px rgba(33, 150, 243, 0.4)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.background = "#2196F3";
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 4px 12px rgba(33, 150, 243, 0.3)";
  });

  // Handle button click
  button.addEventListener("click", async () => {
    console.log("🖱️ AI Extract Data button clicked!");

    // Show loading state
    button.textContent = "📸 Capturing...";
    button.style.background = "#FF9800";
    button.disabled = true;

    try {
      // Update button text for AI analysis phase
      setTimeout(() => {
        button.textContent = "🤖 AI Analyzing...";
      }, 500);

      const propertyData = await extractPropertyDataWithAI();

      if (propertyData && propertyData.price > 0) {
        console.log("📤 Sending AI-extracted property data to extension...");

        // Send message to popup/background script
        const message: ChromeExtensionMessage = {
          type: "PROPERTY_DATA",
          data: propertyData,
        };

        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "❌ Error sending message:",
              chrome.runtime.lastError
            );
          } else {
            console.log("✅ Message sent successfully:", response);
          }
        });

        // Store data in chrome storage for popup to access
        console.log("💾 Storing AI-extracted data in chrome storage...");
        chrome.storage.local.set(
          {
            currentPropertyData: propertyData,
            lastUpdated: Date.now(),
            extractionMethod: "AI_VISION",
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error("❌ Error storing data:", chrome.runtime.lastError);
            } else {
              console.log("✅ Data stored successfully");
            }
          }
        );

        // Show success feedback
        button.textContent = "✅ AI Extracted!";
        button.style.background = "#4CAF50";
        console.log("✅ Success feedback shown");

        setTimeout(() => {
          button.textContent = "🤖 AI Extract Data";
          button.style.background = "#2196F3";
          button.disabled = false;
          console.log("🔄 Button reset to original state");
        }, 3000);
      } else {
        console.log("❌ No valid property data found from AI analysis");

        // Show error feedback
        button.textContent = "❌ AI Failed";
        button.style.background = "#f44336";

        setTimeout(() => {
          button.textContent = "🤖 AI Extract Data";
          button.style.background = "#2196F3";
          button.disabled = false;
        }, 3000);
      }
    } catch (error) {
      console.error("❌ Error in AI extraction process:", error);

      button.textContent = "❌ Error";
      button.style.background = "#f44336";

      setTimeout(() => {
        button.textContent = "🤖 AI Extract Data";
        button.style.background = "#2196F3";
        button.disabled = false;
      }, 3000);
    }
  });

  document.body.appendChild(button);
  console.log("✅ AI-powered calculator button created and added to page");
};

/**
 * Check if current page is a property listing
 */
const isPropertyListingPage = (): boolean => {
  const url = window.location.href;
  const isListing =
    url.includes("realtor.ca") &&
    (url.includes("/real-estate/") || url.includes("/property/"));
  console.log("🔍 Checking if property listing page:", url, "->", isListing);
  return isListing;
};

/**
 * Initialize the content script
 */
const init = (): void => {
  console.log("🚀 Initializing AI-powered content script...");
  console.log("📄 Document ready state:", document.readyState);

  if (isPropertyListingPage()) {
    console.log(
      "✅ This is a property listing page, proceeding with initialization"
    );

    // Wait for page to load
    if (document.readyState === "loading") {
      console.log("⏳ Document still loading, waiting for DOMContentLoaded...");
      document.addEventListener("DOMContentLoaded", () => {
        console.log("✅ DOMContentLoaded fired, creating button");
        createCalculatorButton();
      });
    } else {
      console.log("✅ Document already loaded, creating button immediately");
      createCalculatorButton();
    }

    // Also listen for navigation changes (SPA)
    let lastUrl = location.href;
    console.log("🔄 Setting up navigation listener for SPA changes");
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        console.log("🔄 URL changed from", lastUrl, "to", currentUrl);
        lastUrl = currentUrl;
        if (isPropertyListingPage()) {
          console.log(
            "✅ New URL is also a property listing, creating button after delay"
          );
          setTimeout(createCalculatorButton, 1000);
        }
      }
    }).observe(document, { subtree: true, childList: true });
  } else {
    console.log(
      "❌ This is not a property listing page, skipping initialization"
    );
  }
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  (message: ChromeExtensionMessage, _sender, sendResponse) => {
    console.log("📩 Received message from popup:", message);

    if (message.type === "GET_PROPERTY_DATA") {
      console.log(
        "🔍 Popup requested property data, starting AI extraction..."
      );
      extractPropertyDataWithAI().then((propertyData) => {
        console.log(
          "📤 Sending AI-extracted property data to popup:",
          propertyData
        );
        sendResponse({ data: propertyData });
      });
      return true; // Keep message channel open for async response
    }
  }
);

// Initialize when script loads
console.log("🎯 AI-powered content script loaded, calling init...");
init();
