import React from "react";
import { Box, Button, Typography, Paper, Stack, Divider } from "@mui/material";
import { Google as GoogleIcon } from "@mui/icons-material";
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
        width: 400,
        height: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)",
        p: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 350,
          textAlign: "center",
          borderRadius: 2,
        }}
      >
        <Stack spacing={3}>
          {/* Logo/Title */}
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: "bold",
                color: "#1E3A8A",
                mb: 1,
              }}
            >
              Realize
            </Typography>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{ fontSize: "14px" }}
            >
              Real Estate Investment Calculator
            </Typography>
          </Box>

          <Divider />

          {/* Welcome Message */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
              Welcome Back!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to access your investment calculations and save your
              property analyses.
            </Typography>
            <Typography
              variant="caption"
              color="primary"
              sx={{ fontSize: "12px", fontStyle: "italic", mt: 1 }}
            >
              After signing in, this extension will automatically detect your
              login.
            </Typography>
          </Box>

          {/* Google Sign In Button */}
          <Button
            variant="outlined"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            disabled={loading}
            sx={{
              py: 1.5,
              borderColor: "#4285F4",
              color: "#4285F4",
              "&:hover": {
                borderColor: "#3367D6",
                backgroundColor: "rgba(66, 133, 244, 0.04)",
              },
              "&:disabled": {
                opacity: 0.6,
              },
            }}
          >
            {loading ? "Signing in..." : "Continue with Google"}
          </Button>

          {/* Terms */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "11px", lineHeight: 1.4 }}
          >
            By signing in, you agree to our Terms of Service and Privacy
            Policy!!! Your data is securely stored and never shared with third
            parties.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};
