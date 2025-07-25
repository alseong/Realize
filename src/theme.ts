import { createTheme } from "@mui/material/styles";

// Create Material UI theme with modern 2025 SaaS design
export const theme = createTheme({
  palette: {
    primary: {
      main: "#1E3A8A", // Deep Navy
      light: "#3B82F6",
      dark: "#1E40AF",
    },
    secondary: {
      main: "#F59E0B", // Gold Accent
      light: "#FBBF24",
      dark: "#D97706",
    },
    background: {
      default: "#FFFFFF", // Clean White
      paper: "#FFFFFF", // Clean White
    },
    text: {
      primary: "#1F2937", // Dark gray for primary text
      secondary: "#6B7280", // Medium gray for secondary text
    },
  },
  typography: {
    fontSize: 14,
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 700,
      color: "#1F2937",
      fontSize: "1.125rem",
    },
    body1: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.8125rem",
      lineHeight: 1.4,
    },
  },
  shape: {
    borderRadius: 4,
  },
  spacing: 8, // 8px grid system
  components: {
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 4,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              backgroundColor: "#FFFFFF",
              borderColor: "rgba(30, 58, 138, 0.3)",
            },
            "&.Mui-focused": {
              backgroundColor: "#FFFFFF",
              borderColor: "#1E3A8A",
              boxShadow: "0 0 0 3px rgba(30, 58, 138, 0.1)",
            },
          },
          "& .MuiInputLabel-root": {
            color: "#6B7280",
            "&.Mui-focused": {
              color: "#1E3A8A",
            },
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        size: "medium",
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 6,
          padding: "10px 24px",
          transition: "all 0.2s ease-in-out",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
            transition: "left 0.5s",
          },
          "&:hover::before": {
            left: "100%",
          },
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "scale(1.05)",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#1E3A8A",
          boxShadow: "0 2px 8px rgba(30, 58, 138, 0.2)",
        },
      },
    },
  },
});
