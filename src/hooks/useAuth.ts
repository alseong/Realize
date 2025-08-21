import { useEffect, useReducer } from "react";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  renderKey?: number; // Used to force re-renders
}

// Reducer for auth state management
const authReducer = (state: AuthState, action: any) => {
  console.log(
    "🔄 Auth reducer - action:",
    action.type,
    "payload:",
    action.payload
  );
  switch (action.type) {
    case "SET_AUTH_STATE":
      console.log("🔄 Auth reducer - setting full state:", action.payload);
      return { ...action.payload, renderKey: (state.renderKey || 0) + 1 };
    case "SET_LOADING":
      console.log("🔄 Auth reducer - setting loading:", action.payload);
      return {
        ...state,
        loading: action.payload,
        renderKey: (state.renderKey || 0) + 1,
      };
    default:
      return state;
  }
};

export const useAuth = () => {
  const [authState, dispatch] = useReducer(authReducer, {
    user: null,
    session: null,
    loading: true,
    renderKey: 0,
  });

  // Polling control
  let pollInterval: NodeJS.Timeout | null = null;

  const startPolling = () => {
    if (pollInterval) return; // Already polling

    console.log("🔄 Starting auth state polling...");
    pollInterval = setInterval(() => {
      checkAuthState();
    }, 500);
  };

  const stopPolling = () => {
    if (pollInterval) {
      console.log("⏹️ Stopping auth state polling");
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  // Update functions using dispatch
  const updateLoading = (loadingState: boolean) => {
    console.log("🔄 Dispatching loading state:", loadingState);
    dispatch({ type: "SET_LOADING", payload: loadingState });
  };

  // Combined update function
  const updateAuthState = (newState: AuthState) => {
    console.log("🔄 Dispatching full auth state:", {
      user: !!newState.user,
      session: !!newState.session,
      loading: newState.loading,
    });
    dispatch({ type: "SET_AUTH_STATE", payload: newState });

    // Stop polling once we reach a stable authenticated or unauthenticated state
    if (!newState.loading) {
      console.log("🎯 Auth state stabilized, stopping polling");
      stopPolling();
    }
  };

  // Function to check auth state
  const checkAuthState = async () => {
    try {
      console.log("🔍 Checking auth state...");

      const result = await new Promise<any>((resolve) => {
        chrome.storage.local.get(["session"], resolve);
      });

      const newState = result.session
        ? {
            user: result.session.user,
            session: result.session,
            loading: false,
          }
        : {
            user: null,
            session: null,
            loading: false,
          };

      // Check if state has actually changed
      const stateChanged =
        !!authState.user !== !!newState.user ||
        authState.loading !== newState.loading;

      if (result.session) {
        console.log("✅ Found stored session, user is logged in");
        updateAuthState(newState);
      } else {
        console.log("❌ No stored session found, user needs to sign in");
        updateAuthState(newState);
      }

      // If we've reached a stable state (signed in or signed out),
      // we can reduce polling frequency
      if (!newState.loading && !stateChanged) {
        console.log("🎯 Auth state is stable, polling can be reduced");
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
      updateAuthState({
        user: null,
        session: null,
        loading: false,
      });
    }
  };

  useEffect(() => {
    console.log("🚀 useAuth hook mounted, starting auth monitoring...");

    // Initial auth check
    checkAuthState();

    // Listen for storage changes (immediate detection)
    const storageListener = (changes: any) => {
      if (changes.session) {
        console.log("🔍 Chrome storage changed, checking auth state...");
        checkAuthState();
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    // Cleanup on unmount
    return () => {
      stopPolling();
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log("🔐 Starting Chrome Identity OAuth...");
      updateLoading(true);
      startPolling(); // Start polling during auth process

      // Use Chrome Identity API for popup-style OAuth
      const redirectUrl = chrome.identity.getRedirectURL();
      console.log("🔗 Chrome redirect URL:", redirectUrl);

      // Build Supabase OAuth URL with Chrome's redirect URL
      const authUrl = `https://ovdokgutixbjhmfqbwet.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
        redirectUrl
      )}&access_type=offline&prompt=consent`;

      console.log("🔐 Launching auth popup...");

      // Launch interactive OAuth popup
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });

      console.log("✅ OAuth response URL:", responseUrl);

      if (!responseUrl) {
        throw new Error("OAuth cancelled by user");
      }

      // Parse tokens from the response URL
      const url = new URL(responseUrl);
      const fragment = url.hash.substring(1);
      const params = new URLSearchParams(fragment);

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        throw new Error("Failed to get OAuth tokens");
      }

      console.log("🎉 Got OAuth tokens, storing session...");

      // Decode JWT token for user info
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      console.log("🔍 Token payload:", payload);

      // Create session object
      const session: any = {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: payload.sub,
          email: payload.email,
          user_metadata: payload.user_metadata || {},
          app_metadata: payload.app_metadata || {},
        },
        expires_at: payload.exp * 1000,
      };

      // Store session
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ session }, () => {
          resolve();
        });
      });

      console.log("✅ User signed in successfully");
      console.log("👤 User object:", session.user);
      console.log("🔄 Setting auth state...");

      updateAuthState({
        user: session.user,
        session: session,
        loading: false,
      });

      console.log("✅ Auth state updated");

      return { data: { success: true }, error: null };
    } catch (error) {
      console.error("Sign in error:", error);
      updateLoading(false);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log("🚪 Signing out - clearing Chrome storage...");
      startPolling(); // Start polling during sign out process

      // Clear session from Chrome storage directly
      await new Promise<void>((resolve) => {
        chrome.storage.local.clear(() => {
          resolve();
        });
      });

      console.log("✅ Sign out complete");

      updateAuthState({
        user: null,
        session: null,
        loading: false,
      });
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const returnValue = {
    ...authState,
    signInWithGoogle,
    signOut,
  };

  console.log("🔍 useAuth returning:", {
    user: !!returnValue.user,
    loading: returnValue.loading,
    hasSession: !!returnValue.session,
  });

  return returnValue;
};
