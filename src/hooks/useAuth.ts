import { useState, useEffect } from "react";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  const setLoading = (loadingState: boolean) => {
    setAuthState((prev) => ({ ...prev, loading: loadingState }));
  };

  useEffect(() => {
    // Check for existing stored session on load
    const initializeAuth = async () => {
      try {
        console.log("🔍 Checking for stored session...");

        const result = await new Promise<any>((resolve) => {
          chrome.storage.local.get(["session"], resolve);
        });

        if (result.session) {
          console.log("✅ Found stored session, user is logged in");
          setAuthState({
            user: result.session.user,
            session: result.session,
            loading: false,
          });
        } else {
          console.log("❌ No stored session found, user needs to sign in");
          setAuthState({
            user: null,
            session: null,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setAuthState({
          user: null,
          session: null,
          loading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log("🔐 Starting Chrome Identity OAuth...");
      setLoading(true);

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

      setAuthState({
        user: session.user,
        session: session,
        loading: false,
      });

      console.log("✅ Auth state updated");

      return { data: { success: true }, error: null };
    } catch (error) {
      console.error("Sign in error:", error);
      setLoading(false);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log("🚪 Signing out - clearing Chrome storage...");

      // Clear session from Chrome storage directly
      await new Promise<void>((resolve) => {
        chrome.storage.local.clear(() => {
          resolve();
        });
      });

      console.log("✅ Sign out complete");

      setAuthState({
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
