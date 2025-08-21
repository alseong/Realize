import React from "react";
import { Box, Button, Typography, Stack } from "@mui/material";
import { VillaRounded } from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";

export const AuthPage: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  return (
    <Box
      sx={{
        width: "400px",
        height: "600px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        overflow: "hidden", // Prevent scrollbars
      }}
    >
      <Stack
        spacing={5}
        alignItems="center"
        sx={{
          textAlign: "center",
          width: "100%",
          px: 3,
        }}
      >
        {/* Villa Icon - Clean and Modern */}
        <VillaRounded
          sx={{
            fontSize: "80px",
            color: "#374151",
            display: "block",
            margin: "0 auto",
          }}
        />

        {/* Brand Name and Tagline */}
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontWeight: 300,
              fontSize: "2.5rem",
              color: "#1F2937",
              mb: 1.5,
              letterSpacing: "-0.02em",
            }}
          >
            Realize
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#6B7280",
              fontSize: "1rem",
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            Analyze properties and calculate returns
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              style={{ marginRight: "8px" }}
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          }
          onClick={handleGoogleSignIn}
          disabled={loading}
          sx={{
            backgroundColor: "white",
            color: "#3c4043",
            border: "1px solid #dadce0",
            borderRadius: "8px",
            boxShadow:
              "0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)",
            minWidth: "280px",
            py: 2,
            px: 3,
            fontSize: "1rem",
            fontWeight: 500,
            textTransform: "none",
            "&:hover": {
              backgroundColor: "#f8f9fa",
              boxShadow:
                "0 1px 3px 0 rgba(60,64,67,.30), 0 4px 8px 3px rgba(60,64,67,.15)",
            },
            "&:disabled": {
              backgroundColor: "#f8f9fa",
              color: "#5f6368",
            },
          }}
        >
          {loading ? "Signing in..." : "Continue with Google"}
        </Button>
      </Stack>
    </Box>
  );
};
