import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  InputAdornment,
  ThemeProvider,
  createTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  HomeOutlined,
  AttachMoneyOutlined,
  TrendingUpOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  LaunchOutlined,
  FileDownloadOutlined,
  AutoAwesome,
} from "@mui/icons-material";

import type {
  PropertyData,
  CashflowInputs,
  CashflowResult,
  SavedCalculation,
} from "./types/property";
import {
  calculateCashflow,
  calculateMortgagePayment,
  formatCurrency,
  formatPercentage,
} from "./utils/cashflow";
import {
  getSavedCalculations,
  saveCalculation,
  deleteCalculation,
  loadCalculation,
  formatDate,
  exportToExcel,
} from "./utils/storage";

// Create Material UI theme with modern 2025 SaaS design
const theme = createTheme({
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
        },
        contained: {
          background: "linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)",
          boxShadow: "0 4px 14px 0 rgba(30, 58, 138, 0.3)",
          "&:hover": {
            background: "linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)",
            boxShadow: "0 6px 20px 0 rgba(30, 58, 138, 0.4)",
            transform: "translateY(-1px)",
          },
        },
        outlined: {
          border: "2px solid rgba(30, 58, 138, 0.3)",
          backgroundColor: "#FFFFFF",
          "&:hover": {
            backgroundColor: "rgba(30, 58, 138, 0.05)",
            borderColor: "#1E3A8A",
            transform: "translateY(-1px)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          borderRadius: 4,
          border: "1px solid #E5E7EB",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 2,
          backgroundColor: "rgba(30, 58, 138, 0.1)",
          color: "#1E3A8A",
          border: "1px solid rgba(30, 58, 138, 0.2)",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "rgba(255, 255, 255, 0.2)",
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: "#1E3A8A",
        },
      },
    },
  },
});

const App: React.FC = () => {
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [result, setResult] = useState<CashflowResult | null>(null);
  const [error, setError] = useState<string>("");
  const [extracting, setExtracting] = useState<boolean>(false);
  const [savedCalculations, setSavedCalculations] = useState<
    SavedCalculation[]
  >([]);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [showSavedList, setShowSavedList] = useState<boolean>(false);
  const [saveFormData, setSaveFormData] = useState({
    name: "",
    notes: "",
  });

  // Cashflow input state
  const [inputs, setInputs] = useState<CashflowInputs>({
    purchasePrice: 0,
    downPayment: 0,
    interestRate: 5.5,
    loanTerm: 25,
    monthlyRent: 0,
    propertyTaxes: 0,
    insurance: 0,
    propertyManagement: 8, // 8% of rent
    maintenanceReserve: 7, // 7% of rent
    vacancy: 6, // 6% of rent
    capExReserve: 5, // 5% of rent
    otherExpenses: 0,
  });

  // Down payment percentage state
  const [downPaymentPercentage, setDownPaymentPercentage] =
    useState<number>(20); // Default 20%

  // Load property data and default settings on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load property data from storage
        const result = await chrome.storage.local.get([
          "currentPropertyData",
          "defaultSettings",
        ]);

        if (result.currentPropertyData) {
          const propData: PropertyData = result.currentPropertyData;
          setPropertyData(propData);

          // Set purchase price from property data
          const defaultDownPaymentPercent =
            result.defaultSettings?.downPaymentPercentage || 20;
          const downPaymentAmount = Math.round(
            propData.price * (defaultDownPaymentPercent / 100)
          );

          setInputs((prev) => ({
            ...prev,
            purchasePrice: propData.price,
            downPayment: downPaymentAmount,
            interestRate: result.defaultSettings?.interestRate || 5.5,
            loanTerm: result.defaultSettings?.loanTerm || 25,
            propertyTaxes: Math.round(
              propData.price *
                ((result.defaultSettings?.propertyTaxRate || 1.2) / 100)
            ),
            insurance: Math.round(
              propData.price *
                ((result.defaultSettings?.insuranceRate || 0.3) / 100)
            ),

            vacancy: result.defaultSettings?.vacancyRate || 5,
          }));
        } else {
          // Try to get data from current tab
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { type: "GET_PROPERTY_DATA" },
              (response) => {
                if (response?.data) {
                  setPropertyData(response.data);
                  setInputs((prev) => ({
                    ...prev,
                    purchasePrice: response.data.price,
                  }));
                } else {
                  setError(
                    'No data found. Click "Auto fill with AI" to extract data from the current webpage.'
                  );
                }
              }
            );
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Error loading property data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load saved calculations on mount
  useEffect(() => {
    const loadSavedCalculations = async () => {
      try {
        const calculations = await getSavedCalculations();
        setSavedCalculations(calculations);
      } catch (error) {
        console.error("Error loading saved calculations:", error);
      }
    };

    loadSavedCalculations();
  }, []);

  const handleInputChange =
    (field: keyof CashflowInputs) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(event.target.value) || 0;
      setInputs((prev) => ({ ...prev, [field]: value }));

      // If purchase price changes, update down payment percentage display
      if (field === "purchasePrice" && value > 0) {
        const currentPercentage = (inputs.downPayment / value) * 100;
        setDownPaymentPercentage(Math.round(currentPercentage * 100) / 100);
      }
    };

  const handleDownPaymentDollarChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(event.target.value) || 0;
    setInputs((prev) => ({ ...prev, downPayment: value }));

    // Update percentage based on dollar amount
    if (inputs.purchasePrice > 0) {
      const percentage = (value / inputs.purchasePrice) * 100;
      setDownPaymentPercentage(Math.round(percentage * 100) / 100); // Round to 2 decimal places
    }
  };

  const handleDownPaymentPercentageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(event.target.value) || 0;
    setDownPaymentPercentage(value);

    // Update dollar amount based on percentage
    if (inputs.purchasePrice > 0) {
      const dollarAmount = (inputs.purchasePrice * value) / 100;
      setInputs((prev) => ({ ...prev, downPayment: dollarAmount }));
    }
  };

  const handleAIExtraction = async () => {
    setExtracting(true);
    setError("");

    try {
      console.log("🤖 Starting AI extraction from popup...");

      // Get current active tab
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tabs[0]?.id) {
        // Send message to content script to extract data
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "GET_PROPERTY_DATA" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "❌ Error communicating with content script:",
                chrome.runtime.lastError
              );
              setError(
                "Could not extract data from this page. Make sure you're on a valid webpage."
              );
              setExtracting(false);
              return;
            }

            if (response?.data) {
              console.log("✅ Data extracted successfully:", response.data);
              setPropertyData(response.data);

              // Auto-fill the form with extracted data
              const newPrice = response.data.price || 0;
              setInputs((prev) => {
                const newInputs = {
                  ...prev,
                  purchasePrice: newPrice,
                  monthlyRent: response.data.estimatedRent || 0,
                };

                // Update down payment percentage based on current dollar amount and new price
                if (newPrice > 0 && newInputs.downPayment > 0) {
                  const currentPercentage =
                    (newInputs.downPayment / newPrice) * 100;
                  setDownPaymentPercentage(
                    Math.round(currentPercentage * 100) / 100
                  );
                }

                return newInputs;
              });

              // Store the data
              chrome.storage.local.set({
                currentPropertyData: response.data,
                lastUpdated: Date.now(),
                extractionMethod: "AI_POPUP",
              });

              setError("");

              // Auto-calculate cashflow after AI extraction
              setTimeout(() => {
                try {
                  const calculationResult = calculateCashflow({
                    ...inputs,
                    purchasePrice: newPrice,
                    monthlyRent: response.data.estimatedRent || 0,
                  });
                  setResult(calculationResult);
                  console.log(
                    "✅ Auto-calculated cashflow after AI extraction"
                  );
                } catch (err) {
                  console.error("Auto-calculation error:", err);
                  // Don't show error to user for auto-calculation failures
                }
              }, 100); // Small delay to ensure state updates are complete
            } else {
              console.log("❌ No data returned from content script");
              setError(
                "Could not extract property data from this page. Try a different webpage or enter data manually."
              );
            }
            setExtracting(false);
          }
        );
      } else {
        setError(
          "No active tab found. Please make sure you have a webpage open."
        );
        setExtracting(false);
      }
    } catch (err) {
      console.error("Error during AI extraction:", err);
      setError("Error extracting data. Please try again.");
      setExtracting(false);
    }
  };

  const handleCalculate = () => {
    setCalculating(true);
    setError("");

    try {
      const calculationResult = calculateCashflow(inputs);
      setResult(calculationResult);
    } catch (err) {
      setError("Error calculating cashflow. Please check your inputs.");
      console.error("Calculation error:", err);
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveCalculation = async () => {
    if (!result) {
      setError("Please calculate cashflow first before saving.");
      return;
    }

    if (!saveFormData.name.trim()) {
      setError("Please enter a name for this calculation.");
      return;
    }

    try {
      const address = propertyData?.address || saveFormData.name;
      const listingUrl = propertyData?.url;

      await saveCalculation(
        saveFormData.name.trim(),
        address,
        listingUrl,
        inputs,
        result,
        saveFormData.notes.trim() || undefined
      );

      // Refresh saved calculations list
      const updatedCalculations = await getSavedCalculations();
      setSavedCalculations(updatedCalculations);

      // Reset form and close dialog
      setSaveFormData({ name: "", notes: "" });
      setShowSaveDialog(false);
      setError("");

      console.log("✅ Calculation saved successfully");
    } catch (error) {
      console.error("Error saving calculation:", error);
      setError("Failed to save calculation. Please try again.");
    }
  };

  const handleDeleteCalculation = async (id: string) => {
    try {
      await deleteCalculation(id);
      const updatedCalculations = await getSavedCalculations();
      setSavedCalculations(updatedCalculations);
      console.log("✅ Calculation deleted successfully");
    } catch (error) {
      console.error("Error deleting calculation:", error);
      setError("Failed to delete calculation. Please try again.");
    }
  };

  const handleLoadCalculation = (calculation: SavedCalculation) => {
    loadCalculation(calculation, setInputs, setPropertyData);
    setResult(calculation.results);

    // Update down payment percentage based on loaded values
    if (calculation.inputs.purchasePrice > 0) {
      const percentage =
        (calculation.inputs.downPayment / calculation.inputs.purchasePrice) *
        100;
      setDownPaymentPercentage(Math.round(percentage * 100) / 100);
    }

    setShowSavedList(false);
    console.log("✅ Calculation loaded successfully");
  };

  const openSaveDialog = () => {
    if (!result) {
      setError("Please calculate cashflow first before saving.");
      return;
    }

    // Pre-fill name with address if available
    const defaultName = propertyData?.address || "Property Calculation";
    setSaveFormData({
      name: defaultName,
      notes: "",
    });
    setShowSaveDialog(true);
  };

  const handleExportToExcel = async () => {
    try {
      await exportToExcel();
      console.log("✅ Excel export completed successfully");
    } catch (error) {
      console.error("❌ Error exporting to Excel:", error);
      setError("Failed to export to Excel. Please try again.");
    }
  };

  const getCashflowColor = (cashflow: number) => {
    if (cashflow > 0) return "secondary"; // Gold accent for positive cashflow (profit)
    if (cashflow < 0) return "error"; // Red for negative cashflow (loss)
    return "text.secondary"; // Muted gray for zero/neutral
  };

  // Helper functions to calculate dollar amounts from percentages
  const calculatePropertyMgmtDollar = () => {
    const percentage = parseFloat(inputs.propertyManagement.toString()) || 0;
    const monthlyRent = parseFloat(inputs.monthlyRent.toString()) || 0;
    return (percentage / 100) * monthlyRent;
  };

  const calculateMaintenanceDollar = () => {
    const percentage = parseFloat(inputs.maintenanceReserve.toString()) || 0;
    const monthlyRent = parseFloat(inputs.monthlyRent.toString()) || 0;
    return (percentage / 100) * monthlyRent;
  };

  const calculateVacancyDollar = () => {
    const percentage = parseFloat(inputs.vacancy.toString()) || 0;
    const monthlyRent = parseFloat(inputs.monthlyRent.toString()) || 0;
    return (percentage / 100) * monthlyRent;
  };

  const calculateCapExDollar = () => {
    const percentage = parseFloat(inputs.capExReserve.toString()) || 0;
    const monthlyRent = parseFloat(inputs.monthlyRent.toString()) || 0;
    return (percentage / 100) * monthlyRent;
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 200,
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          width: 400,
          maxHeight: 600,
          overflow: "auto",
          background: "#FFFFFF",
          minHeight: "100vh",
        }}
      >
        {/* App Bar */}
        <AppBar
          position="sticky"
          sx={{
            backgroundColor: "#1E3A8A",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            top: 0,
            zIndex: 1000,
          }}
        >
          <Toolbar sx={{ minHeight: 48, px: 2 }}>
            <HomeOutlined sx={{ color: "#F59E0B", fontSize: 24 }} />
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Save current calculation with notes">
              <IconButton
                onClick={openSaveDialog}
                disabled={!result}
                sx={{ color: "#FFFFFF", mr: 1 }}
              >
                <SaveOutlined />
              </IconButton>
            </Tooltip>
            <Tooltip title="View saved calculations">
              <IconButton
                onClick={() => setShowSavedList(true)}
                sx={{ color: "#FFFFFF" }}
              >
                <FolderOpenOutlined />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* AI Extraction Button */}
          <Button
            variant="contained"
            onClick={handleAIExtraction}
            disabled={extracting}
            startIcon={
              extracting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <AutoAwesome sx={{ fontSize: 18 }} />
              )
            }
            fullWidth
            sx={{
              mb: 3,
              py: 1.5,
              background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              color: "#FFFFFF",
              boxShadow: "0 4px 14px 0 rgba(245, 158, 11, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
                boxShadow: "0 6px 20px 0 rgba(245, 158, 11, 0.4)",
                transform: "translateY(-1px)",
              },
              "&:disabled": {
                background: "#64748B",
                color: "#FFFFFF",
                transform: "none",
              },
            }}
          >
            {extracting ? "🤖 Extracting with AI..." : "Auto Fill"}
          </Button>

          {/* Property Information */}
          {propertyData && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
              >
                <HomeOutlined
                  sx={{ mr: 1, fontSize: 18, color: "secondary.main" }}
                />
                Property Details
              </Typography>
              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E5E7EB",
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="body2"
                  noWrap
                  title={propertyData.address}
                  sx={{ mb: 1, fontWeight: 500 }}
                >
                  {propertyData.address}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    flexWrap: "wrap",
                    mt: 1,
                  }}
                >
                  <Chip
                    label={formatCurrency(propertyData.price)}
                    size="small"
                    color="secondary"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip label={propertyData.propertyType} size="small" />
                  {propertyData.bedrooms && (
                    <Chip label={`${propertyData.bedrooms} bed`} size="small" />
                  )}
                  {propertyData.bathrooms && (
                    <Chip
                      label={`${propertyData.bathrooms} bath`}
                      size="small"
                    />
                  )}
                </Box>
              </Card>
            </Box>
          )}

          {/* Basic Inputs */}
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", mb: 2 }}
          >
            <AttachMoneyOutlined
              sx={{ mr: 1, fontSize: 18, color: "secondary.main" }}
            />
            Investment Details
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="Purchase Price"
                value={inputs.purchasePrice}
                onChange={handleInputChange("purchasePrice")}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Down Payment"
                value={inputs.downPayment}
                onChange={handleDownPaymentDollarChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="%"
                value={downPaymentPercentage}
                onChange={handleDownPaymentPercentageChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                }}
                sx={{ width: "25%" }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="Interest Rate"
                value={inputs.interestRate}
                onChange={handleInputChange("interestRate")}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Loan Term"
                value={inputs.loanTerm}
                onChange={handleInputChange("loanTerm")}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">yrs</InputAdornment>
                  ),
                }}
                sx={{ flex: 1 }}
              />
            </Box>
            {/* Monthly Mortgage Alert */}
            {inputs.purchasePrice > 0 && inputs.downPayment > 0 && (
              <Alert
                severity="info"
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: "rgba(30, 58, 138, 0.1)",
                  border: "1px solid rgba(30, 58, 138, 0.2)",
                  "& .MuiAlert-icon": {
                    color: "#1E3A8A",
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Monthly Mortgage:{" "}
                  {formatCurrency(
                    calculateMortgagePayment(
                      inputs.purchasePrice - inputs.downPayment,
                      inputs.interestRate,
                      inputs.loanTerm
                    )
                  )}
                </Typography>
              </Alert>
            )}
            <TextField
              label="Monthly Rent"
              value={inputs.monthlyRent}
              onChange={handleInputChange("monthlyRent")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              fullWidth
            />
          </Box>

          {/* Property Taxes and Insurance */}
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              label="Monthly Property Tax"
              value={inputs.propertyTaxes}
              onChange={handleInputChange("propertyTaxes")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Monthly Insurance"
              value={inputs.insurance}
              onChange={handleInputChange("insurance")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
          </Box>

          {/* Property Management and Maintenance Reserve */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Prop Mgmt"
              value={inputs.propertyManagement}
              onChange={handleInputChange("propertyManagement")}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              sx={{ flex: 1, pb: 1 }}
              helperText={`${formatCurrency(
                calculatePropertyMgmtDollar()
              )} / month`}
            />
            <TextField
              label="Maintenance"
              value={inputs.maintenanceReserve}
              onChange={handleInputChange("maintenanceReserve")}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              sx={{ flex: 1, pb: 1 }}
              helperText={`${formatCurrency(
                calculateMaintenanceDollar()
              )} / month`}
            />
          </Box>

          {/* Vacancy Rate and CapEx Reserve */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Vacancy"
              value={inputs.vacancy}
              onChange={handleInputChange("vacancy")}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              sx={{ flex: 1, pb: 1 }}
              helperText={`${formatCurrency(calculateVacancyDollar())} / month`}
            />
            <TextField
              label="CapEx"
              value={inputs.capExReserve}
              onChange={handleInputChange("capExReserve")}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              sx={{ flex: 1, pb: 1 }}
              helperText={`${formatCurrency(calculateCapExDollar())} / month`}
            />
          </Box>

          {/* Other Expenses */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Monthly Other"
              value={inputs.otherExpenses}
              onChange={handleInputChange("otherExpenses")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
          </Box>

          {/* Calculate Button */}
          <Button
            variant="contained"
            onClick={handleCalculate}
            disabled={calculating || inputs.purchasePrice === 0}
            startIcon={
              calculating ? (
                <CircularProgress size={18} />
              ) : (
                <TrendingUpOutlined />
              )
            }
            fullWidth
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              background: "linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)",
              boxShadow: "0 4px 14px 0 rgba(30, 58, 138, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)",
                boxShadow: "0 6px 20px 0 rgba(30, 58, 138, 0.4)",
                transform: "translateY(-1px)",
              },
              "&:disabled": {
                background: "#64748B",
                transform: "none",
              },
            }}
          >
            {calculating ? "Calculating..." : "Calculate Cashflow"}
          </Button>

          {/* Results */}
          {result && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Cashflow Analysis
              </Typography>

              {/* Key Metrics */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Card
                    variant="outlined"
                    sx={{ p: 1, textAlign: "center", flex: 1 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Monthly Cashflow
                    </Typography>
                    <Typography
                      variant="h6"
                      color={getCashflowColor(result.monthlyCashflow)}
                      sx={{ fontWeight: "bold" }}
                    >
                      {formatCurrency(result.monthlyCashflow)}
                    </Typography>
                  </Card>
                  <Card
                    variant="outlined"
                    sx={{ p: 1, textAlign: "center", flex: 1 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Annual Cashflow
                    </Typography>
                    <Typography
                      variant="h6"
                      color={getCashflowColor(result.annualCashflow)}
                      sx={{ fontWeight: "bold" }}
                    >
                      {formatCurrency(result.annualCashflow)}
                    </Typography>
                  </Card>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Card
                    variant="outlined"
                    sx={{ p: 1, textAlign: "center", flex: 1 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Cash-on-Cash Return
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {formatPercentage(result.cashOnCashReturn)}
                    </Typography>
                  </Card>
                  <Card
                    variant="outlined"
                    sx={{ p: 1, textAlign: "center", flex: 1 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Cap Rate
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {formatPercentage(result.capRate)}
                    </Typography>
                  </Card>
                </Box>
              </Box>

              {/* Monthly Breakdown */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Monthly Breakdown
                </Typography>
                <Box
                  sx={{
                    "& > *": {
                      display: "flex",
                      justifyContent: "space-between",
                      py: 0.5,
                    },
                  }}
                >
                  <Box>
                    <Typography variant="body2">Monthly Income:</Typography>
                    <Typography variant="body2" color="success.main">
                      {formatCurrency(result.monthlyIncome)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2">Monthly Expenses:</Typography>
                    <Typography variant="body2" color="error.main">
                      {formatCurrency(result.monthlyExpenses)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2">- Mortgage Payment:</Typography>
                    <Typography variant="body2">
                      {formatCurrency(result.monthlyMortgage)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Net Cashflow:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={getCashflowColor(result.monthlyCashflow)}
                    >
                      {formatCurrency(result.monthlyCashflow)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* Save Calculation Dialog */}
          <Dialog
            open={showSaveDialog}
            onClose={() => setShowSaveDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Save Calculation</DialogTitle>
            <DialogContent>
              <TextField
                label="Calculation Name"
                value={saveFormData.name}
                onChange={(e) =>
                  setSaveFormData({ ...saveFormData, name: e.target.value })
                }
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Notes (Optional)"
                value={saveFormData.notes}
                onChange={(e) =>
                  setSaveFormData({ ...saveFormData, notes: e.target.value })
                }
                fullWidth
                margin="normal"
                multiline
                rows={3}
                placeholder="Add any notes about this property or calculation..."
              />
              {propertyData?.address && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Address: {propertyData.address}
                </Typography>
              )}
              {propertyData?.url && (
                <Typography variant="body2" color="text.secondary">
                  Listing URL: {propertyData.url}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
              <Button
                onClick={handleSaveCalculation}
                variant="contained"
                disabled={!saveFormData.name.trim()}
              >
                Save
              </Button>
            </DialogActions>
          </Dialog>

          {/* Saved Calculations Dialog */}
          <Dialog
            open={showSavedList}
            onClose={() => setShowSavedList(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Saved Calculations ({savedCalculations.length})
            </DialogTitle>
            <DialogContent>
              {savedCalculations.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  No saved calculations yet. Calculate cashflow and save your
                  first property analysis!
                </Typography>
              ) : (
                <List>
                  {savedCalculations.map((calc) => (
                    <ListItem
                      key={calc.id}
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        mb: 1,
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <ListItemText
                        primary={calc.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {calc.address}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Cashflow:{" "}
                              {formatCurrency(calc.results.monthlyCashflow)}
                              /month
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Saved: {formatDate(calc.savedAt)}
                            </Typography>
                            {calc.notes && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontStyle: "italic" }}
                              >
                                {calc.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          {calc.listingUrl && (
                            <Tooltip title="Open Listing">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  window.open(calc.listingUrl, "_blank")
                                }
                              >
                                <LaunchOutlined />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Load Calculation">
                            <IconButton
                              size="small"
                              onClick={() => handleLoadCalculation(calc)}
                              color="primary"
                            >
                              <FolderOpenOutlined />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteCalculation(calc.id)}
                              color="error"
                            >
                              <DeleteOutlined />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleExportToExcel}
                startIcon={<FileDownloadOutlined />}
                disabled={savedCalculations.length === 0}
                variant="outlined"
              >
                Export to Excel
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <Button onClick={() => setShowSavedList(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
