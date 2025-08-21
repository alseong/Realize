import type { ChromeExtensionMessage, PropertyData } from "./types/property";
import { createClient } from "@supabase/supabase-js";

console.log("🚀 Background script starting...");

// Force service worker to stay active by setting up a keepalive
chrome.runtime.onStartup.addListener(() => {
  console.log("🔄 Runtime startup event");
});

// Test basic Chrome APIs
try {
  console.log("🔍 Testing Chrome APIs...");
  console.log("🔍 Extension ID:", chrome.runtime.id);
  console.log("🔍 Redirect URL:", chrome.identity.getRedirectURL());
  console.log("✅ Chrome APIs working");
} catch (error) {
  console.error("❌ Chrome APIs test failed:", error);
}

// Use Vercel proxy to keep API keys secure
const PROXY_URL = "https://realize-virid.vercel.app";

// Initialize Supabase client in background script
let supabase: any = null;

try {
  supabase = createClient(
    "https://ovdokgutixbjhmfqbwet.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZG9rZ3V0aXhiamhtZnFid2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MzY4NjcsImV4cCI6MjA3MTMxMjg2N30.bkiOZpNJAO79mPCnf6UBVF25YZ8K3k47vp0gQA02Uas",
    {
      auth: {
        storage: {
          getItem: (key: string) => {
            return new Promise((resolve) => {
              chrome.storage.local.get([key], (result) => {
                resolve(result[key] || null);
              });
            });
          },
          setItem: (key: string, value: string) => {
            return new Promise((resolve) => {
              chrome.storage.local.set({ [key]: value }, () => {
                resolve();
              });
            });
          },
          removeItem: (key: string) => {
            return new Promise((resolve) => {
              chrome.storage.local.remove([key], () => {
                resolve();
              });
            });
          },
        },
      },
    }
  );
  console.log("Background: Supabase client initialized successfully");
} catch (error) {
  console.error("Background: Failed to initialize Supabase client:", error);
}

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

    const propertyData = result.propertyData;
    console.log("🔍 Raw AI response:", propertyData);

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

// OAuth flow - temporarily disabled for testing
// Will re-enable once basic communication works

// Handle OAuth callback
async function handleOAuthCallback(url: string) {
  try {
    console.log("Handling OAuth callback:", url);

    // Extract tokens from URL hash
    const hashMap = parseUrlHash(url);
    const accessToken = hashMap.get("access_token");
    const refreshToken = hashMap.get("refresh_token");

    if (!accessToken || !refreshToken) {
      throw new Error("No tokens found in URL hash");
    }

    // Set session with tokens
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) throw error;

    // Store session in extension storage
    await chrome.storage.local.set({ session: data.session });

    console.log("Successfully set session from OAuth callback");
    return data.session;
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    throw error;
  }
}

// Parse URL hash helper
function parseUrlHash(url: string) {
  const hashParts = new URL(url).hash.slice(1).split("&");
  const hashMap = new Map(
    hashParts.map((part) => {
      const [name, value] = part.split("=");
      return [name, value];
    })
  );
  return hashMap;
}

// Listen for tab updates to catch OAuth redirect
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url?.startsWith(chrome.identity.getRedirectURL())) {
    handleOAuthCallback(changeInfo.url)
      .then(() => {
        // Close the OAuth tab
        chrome.tabs.remove(tabId);
        // Notify popup that auth is complete
        chrome.runtime.sendMessage({ type: "AUTH_SUCCESS" });
      })
      .catch((error) => {
        console.error("OAuth callback error:", error);
        chrome.tabs.remove(tabId);
        chrome.runtime.sendMessage({
          type: "AUTH_ERROR",
          error: error.message,
        });
      });
  }
});

// Restore session on startup
async function restoreSession() {
  if (!supabase) {
    console.log(
      "Background: Cannot restore session - Supabase not initialized"
    );
    return;
  }

  try {
    console.log("Background: Attempting to restore session...");

    // Try to get existing session from Chrome storage
    const result: any = await new Promise((resolve) => {
      chrome.storage.local.get(["session"], resolve);
    });

    if (result.session) {
      console.log("Background: Found stored session, setting in Supabase...");

      // Set the session in Supabase
      const { error } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (error) {
        console.error("Background: Failed to restore session:", error);
        // Clear invalid session
        chrome.storage.local.remove(["session"]);
      } else {
        console.log("Background: ✅ Session restored successfully");
      }
    } else {
      console.log("Background: No stored session found");
    }
  } catch (error) {
    console.error("Background: Error restoring session:", error);
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((_details) => {
  // Extension installed or updated
  console.log("Background: Extension installed/updated");

  // Restore session after a short delay to ensure everything is initialized
  setTimeout(restoreSession, 1000);
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener(
  (message: ChromeExtensionMessage, _sender, sendResponse) => {
    console.log("🔔 Background: Received message:", message.type);

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

    if (message.type === "INITIATE_GOOGLE_AUTH") {
      console.log("🔐 Background: Initiating Google auth...");

      // Simple test response first
      try {
        console.log("🔐 Background: Testing basic response...");
        sendResponse({
          success: false,
          error: "Auth not implemented yet - but message received!",
        });
        return true;
      } catch (error) {
        console.error("❌ Failed to send test response:", error);
        return false;
      }
    }

    if (message.type === "GET_SESSION") {
      console.log("Background: Received GET_SESSION request");

      if (!supabase) {
        sendResponse({ success: false, error: "Supabase not initialized" });
        return true;
      }

      // First try to get session from Supabase (will auto-refresh if needed)
      supabase.auth
        .getSession()
        .then(({ data: { session }, error }: any) => {
          console.log("Background: Session result:", !!session, error?.message);

          if (error) {
            // If Supabase session fails, try Chrome storage as fallback
            console.log("Background: Trying Chrome storage fallback...");
            chrome.storage.local.get(["session"], (result) => {
              if (result.session) {
                console.log("Background: Found session in Chrome storage");
                sendResponse({ success: true, session: result.session });
              } else {
                console.log("Background: No session found anywhere");
                sendResponse({ success: false, error: error.message });
              }
            });
          } else if (session) {
            // Update Chrome storage with fresh session
            chrome.storage.local.set({ session });
            sendResponse({ success: true, session });
          } else {
            console.log("Background: No active session");
            sendResponse({ success: true, session: null });
          }
        })
        .catch((error: any) => {
          console.error("Background: Session error:", error);
          // Fallback to Chrome storage
          chrome.storage.local.get(["session"], (result) => {
            if (result.session) {
              console.log(
                "Background: Using Chrome storage session as fallback"
              );
              sendResponse({ success: true, session: result.session });
            } else {
              sendResponse({ success: false, error: error.message });
            }
          });
        });

      return true; // Keep message channel open for async response
    }

    if (message.type === "SIGN_OUT") {
      if (!supabase) {
        sendResponse({ success: false, error: "Supabase not initialized" });
        return true;
      }

      supabase.auth
        .signOut()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error: any) => {
          sendResponse({ success: false, error: error.message });
        });

      return true; // Keep message channel open for async response
    }
  }
);

// Setup auth state change listener after everything else is initialized
if (supabase) {
  console.log("🔗 Setting up auth state change listener...");
  try {
    supabase.auth.onAuthStateChange((event: any, session: any) => {
      console.log("Auth state changed:", event, session);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        chrome.storage.local.set({ session });
      }

      if (event === "SIGNED_OUT") {
        chrome.storage.local.clear();
      }
    });
    console.log("✅ Auth state listener setup complete");
  } catch (error) {
    console.error("❌ Failed to setup auth state listener:", error);
  }
} else {
  console.error(
    "❌ Cannot setup auth state listener - Supabase not initialized"
  );
}
