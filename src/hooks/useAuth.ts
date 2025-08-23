import { useEffect, useReducer } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

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
        authState.loading !== newState.loading ||
        authState.session?.access_token !== newState.session?.access_token;

      // Only update state if something actually changed
      if (stateChanged) {
        if (result.session) {
          console.log(
            "✅ Auth state changed: Found stored session, user is logged in"
          );
        } else {
          console.log(
            "✅ Auth state changed: No stored session found, user needs to sign in"
          );
        }
        updateAuthState(newState);
      } else {
        console.log("🔄 Auth state unchanged, skipping update");
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

    // Listen for Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔔 Supabase auth event:", event, session);

      if (event === "SIGNED_IN" && session) {
        console.log("✅ User signed in via Supabase");
        // Store session in Chrome storage for persistence
        await chrome.storage.local.set({ session });

        updateAuthState({
          user: session.user,
          session: session,
          loading: false,
        });
        stopPolling();
      } else if (event === "SIGNED_OUT") {
        console.log("👋 User signed out via Supabase");
        await chrome.storage.local.remove(["session"]);

        updateAuthState({
          user: null,
          session: null,
          loading: false,
        });
      }
    });

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
      subscription.unsubscribe();
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log("🔐 Starting Google OAuth with Supabase...");
      dispatch({ type: "SET_LOADING", payload: true });
      startPolling();

      // Get the current extension's redirect URL dynamically
      const redirectUrl = chrome.identity.getRedirectURL();
      console.log("🔗 Using redirect URL:", redirectUrl);

      // Use Supabase's built-in OAuth with the dynamic redirect URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        throw error;
      }

      console.log("✅ OAuth initiated successfully");
      console.log("🔗 OAuth URL:", data.url);

      // The auth state will be updated automatically by the auth listener
      // No need to manually update state here
    } catch (error) {
      console.log("Sign in error:", error);
      dispatch({ type: "SET_LOADING", payload: false });
      stopPolling();
      throw error;
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

  return {
    ...authState,
    signInWithGoogle,
    signOut,
  };
};
