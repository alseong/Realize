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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  // ListItemText,
  // ListItemSecondaryAction,
  IconButton,
  Tooltip,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  Villa,
  AttachMoneyOutlined,
  TrendingUpOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  CalculateOutlined,
  DeleteOutlined,
  LaunchOutlined,
  FileDownloadOutlined,
  AutoAwesome,
} from "@mui/icons-material";
import { theme } from "./theme";

import type {
  PropertyData,
  CashflowInputs,
  CashflowResult,
  SavedCalculation,
} from "./types/property";
import {
  calculateCashflow,
  calculateMortgagePayment,
  calculateMinimumDownPayment,
  calculateDownPaymentPercentage,
  calculateDownPaymentAmount,
  calculateCMHCPremium,
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
  saveCurrentCalculation,
  loadCurrentCalculation,
  clearCurrentCalculation,
} from "./utils/storage";

function App() {
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
    hoaFees: 0, // monthly
    otherExpenses: 0,
  });

  // Down payment percentage state
  const [downPaymentPercentage, setDownPaymentPercentage] =
    useState<number>(20); // Default 20%

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Get current active tab
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (!tabs[0]?.url) {
          setLoading(false);
          return;
        }

        const currentUrl = tabs[0].url;

        // Try to load current calculation first
        const currentCalculation = await loadCurrentCalculation();

        console.log("🔍 App initialization debug:");
        console.log(
          "- Current calculation:",
          currentCalculation ? "found" : "not found"
        );
        console.log("- Current URL:", currentUrl);

        if (currentCalculation) {
          console.log("✅ Loading current calculation from storage");
          setInputs(currentCalculation.inputs);
          setResult(currentCalculation.results);
          setPropertyData(currentCalculation.propertyData);

          // Update down payment percentage
          if (currentCalculation.inputs.purchasePrice > 0) {
            const percentage =
              (currentCalculation.inputs.downPayment /
                currentCalculation.inputs.purchasePrice) *
              100;
            setDownPaymentPercentage(Math.round(percentage * 100) / 100);
          }

          setError("");
          setLoading(false);
        } else {
          console.log(
            "🔄 No cached data found, showing manual Auto Fill button"
          );
          setLoading(false);
          // Don't auto-analyze, just show the manual button
        }
      } catch (error) {
        console.error("Error initializing app:", error);
        setLoading(false);
      }
    };

    initializeApp();
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

      // If purchase price changes, always default to 20% down payment
      if (field === "purchasePrice" && value > 0) {
        const defaultDownPayment = (value * 20) / 100;
        setInputs((prev) => ({ ...prev, downPayment: defaultDownPayment }));
        setDownPaymentPercentage(20);
      }
    };

  // Auto-calculate only mortgage payment for real-time updates
  useEffect(() => {
    if (inputs.purchasePrice > 0 && inputs.downPayment > 0 && result) {
      try {
        // Only update the mortgage-related calculations in real-time
        const loanAmount = inputs.purchasePrice - inputs.downPayment;
        const cmhc = calculateCMHCPremium(loanAmount, inputs.purchasePrice);
        const totalMortgageAmount = loanAmount + cmhc.premium;
        const monthlyMortgage = calculateMortgagePayment(
          totalMortgageAmount,
          inputs.interestRate,
          inputs.loanTerm
        );

        // Update only the mortgage-related fields in the existing result
        setResult((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            monthlyMortgage: Math.round(monthlyMortgage * 100) / 100,
            cmhcPremium: cmhc.premium,
            cmhcRate: cmhc.rate,
            cmhcLtv: cmhc.ltv,
            totalMortgageAmount: Math.round(totalMortgageAmount * 100) / 100,
          };
        });
        console.log("🔄 Auto-updated mortgage payment from input change");
      } catch (err) {
        console.error("Auto-mortgage calculation error:", err);
      }
    }
  }, [
    inputs.purchasePrice,
    inputs.downPayment,
    inputs.interestRate,
    inputs.loanTerm,
  ]);

  const handleDownPaymentDollarChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(event.target.value) || 0;
    setInputs((prev) => ({ ...prev, downPayment: value }));

    // Update percentage based on dollar amount
    if (inputs.purchasePrice > 0) {
      const percentage = calculateDownPaymentPercentage(
        value,
        inputs.purchasePrice
      );
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
      const dollarAmount = calculateDownPaymentAmount(
        value,
        inputs.purchasePrice
      );
      setInputs((prev) => ({ ...prev, downPayment: dollarAmount }));
    }
  };

  // Calculate minimum down payment for current purchase price
  const minimumDownPayment = calculateMinimumDownPayment(inputs.purchasePrice);
  const minimumDownPaymentPercentage =
    inputs.purchasePrice > 0
      ? calculateDownPaymentPercentage(minimumDownPayment, inputs.purchasePrice)
      : 0;
  const isDownPaymentBelowMinimum =
    inputs.downPayment < minimumDownPayment && inputs.purchasePrice > 0;

  const refreshCurrentPage = async () => {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tabs[0]?.id) {
        await chrome.tabs.reload(tabs[0].id);

        // Reset app state and rerender
        setLoading(false);
        setError("");
        setPropertyData(null);
        setResult(null);
        setExtracting(false);
      }
    } catch (error) {
      console.error("Error refreshing page:", error);
    }
  };

  const handleAIExtraction = async () => {
    setExtracting(true);
    setError("");

    try {
      // Get current active tab
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tabs[0]?.id) {
        setError("We could not auto extract the data from this page.");
        setExtracting(false);
        return;
      }

      // Check if content script is available on this page
      const tab = tabs[0];
      if (
        tab.url?.startsWith("chrome://") ||
        tab.url?.startsWith("about:") ||
        tab.url?.startsWith("chrome-extension://")
      ) {
        setError("We could not auto extract the data from this page.");
        setExtracting(false);
        return;
      }

      // Always try to inject content script - this ensures it works for existing tabs
      console.log(
        "🔍 Attempting to inject content script into tab:",
        tab.id,
        "URL:",
        tab.url
      );

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          files: ["assets/content.js"],
        });
        console.log("✅ Content script injected successfully");

        // Small delay to ensure script is loaded
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (injectionError) {
        console.log("⚠️ Content script injection failed:", injectionError);

        // If injection fails, try to refresh the page and inject again
        try {
          console.log("🔄 Attempting to reload tab and inject script...");
          await chrome.tabs.reload(tab.id!);

          // Wait for page to load
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Try injection again
          await chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            files: ["assets/content.js"],
          });
          console.log("✅ Content script injected after reload");

          // Additional delay after reload
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (reloadError) {
          console.log("❌ Failed to inject after reload:", reloadError);
          setError("Please refresh the page manually and try again.");
          setExtracting(false);
          return;
        }
      }

      // Send message to content script to extract data with timeout
      const messageTimeout = setTimeout(() => {
        setError("Request timed out. Please refresh the page and try again.");
        setExtracting(false);
      }, 10000); // 10 second timeout

      chrome.tabs.sendMessage(
        tab.id!,
        { type: "GET_PROPERTY_DATA" },
        (response: any) => {
          clearTimeout(messageTimeout); // Clear timeout if we get a response

          if (chrome.runtime.lastError) {
            console.error(
              "Error communicating with content script:",
              chrome.runtime.lastError
            );

            // Check if the error is due to content script not being available
            if (
              chrome.runtime.lastError.message?.includes(
                "Could not establish connection"
              )
            ) {
              setError(
                "Please refresh the page and try again. The extension needs to reconnect to this page."
              );
            } else {
              setError("We could not auto extract the data from this page.");
            }
            setExtracting(false);
            return;
          }

          if (response?.data) {
            console.log("✅ Property data received in popup:", response.data);
            console.log("🔍 Financial data received:", {
              propertyTax: response.data.propertyTax,
              insurance: response.data.insurance,
              monthlyRent: response.data.monthlyRent,
              interestRate: response.data.interestRate,
            });
            setPropertyData(response.data);

            // Auto-fill the form with extracted data
            const newPrice = response.data.price || 0;
            setInputs((prev) => {
              const newInputs = {
                ...prev,
                purchasePrice: newPrice,
                propertyTaxes: response.data.propertyTax || 0,
                insurance: response.data.insurance || 0,
                hoaFees: response.data.hoaFees || 0,
                monthlyRent: response.data.monthlyRent || 0,
                interestRate: response.data.interestRate || 6.5, // Default to 6.5% if not provided
              };

              // Update down payment percentage based on current dollar amount and new price
              if (newPrice > 0) {
                if (newInputs.downPayment > 0) {
                  const currentPercentage =
                    (newInputs.downPayment / newPrice) * 100;
                  setDownPaymentPercentage(
                    Math.round(currentPercentage * 100) / 100
                  );
                } else {
                  // If down payment is 0, set it to 20% of the new price
                  const defaultDownPayment = (newPrice * 20) / 100;
                  newInputs.downPayment = defaultDownPayment;
                  setDownPaymentPercentage(20);
                }
              }

              return newInputs;
            });

            // Store the data with current URL
            chrome.storage.local.set({
              currentPropertyData: response.data,
              lastUpdated: Date.now(),
              cachedUrl: tab.url,
              extractionMethod: "AI_POPUP",
            });

            setError("");

            // Auto-calculate cashflow after AI extraction
            setTimeout(() => {
              try {
                // Calculate down payment based on percentage if not set
                const downPaymentAmount =
                  inputs.downPayment > 0
                    ? inputs.downPayment
                    : newPrice * (downPaymentPercentage / 100);

                const calculationResult = calculateCashflow({
                  ...inputs,
                  purchasePrice: newPrice,
                  downPayment: downPaymentAmount,
                  propertyTaxes: response.data.propertyTax || 0,
                  insurance: response.data.insurance || 0,
                  hoaFees: response.data.hoaFees || 0,
                  monthlyRent: response.data.monthlyRent || 0,
                  interestRate: response.data.interestRate || 6.5,
                });
                setResult(calculationResult);

                // Save current calculation to storage
                const updatedInputs = {
                  ...inputs,
                  purchasePrice: newPrice,
                  downPayment: downPaymentAmount,
                  propertyTaxes: response.data.propertyTax || 0,
                  insurance: response.data.insurance || 0,
                  hoaFees: response.data.hoaFees || 0,
                  monthlyRent: response.data.monthlyRent || 0,
                  interestRate: response.data.interestRate || 6.5,
                };
                saveCurrentCalculation(
                  updatedInputs,
                  calculationResult,
                  response.data
                );
              } catch (err) {
                console.error("Auto-calculation error:", err);
              }
            }, 100);
          } else {
            setError("We could not auto extract the data from this page.");
          }
          setExtracting(false);
          console.log(extracting);
        }
      );
    } catch (err) {
      console.error("Error during AI extraction:", err);
      setError("We could not auto extract the data from this page.");
      setExtracting(false);
    }
  };

  const handleCalculate = () => {
    setCalculating(true);
    setError("");

    try {
      console.log(`🔍 Calculate Debug: inputs=`, inputs);
      const calculationResult = calculateCashflow(inputs);
      setResult(calculationResult);

      // Save current calculation to storage
      saveCurrentCalculation(inputs, calculationResult, propertyData);
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
            <Villa sx={{ color: "#F59E0B", fontSize: 24 }} />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              onClick={() => {
                window.open("https://forms.gle/EdzjCXBY5KK9DzyK7", "_blank");
              }}
              sx={{
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 400,
                mr: 1,
                textTransform: "none",
                minWidth: "auto",
                padding: "6px 8px",
                border: "none",
                "&:hover": {
                  backgroundColor: "transparent",
                  border: "none",
                },
                "&:focus": {
                  outline: "none",
                },
              }}
            >
              Feedback
            </Button>
            <Button
              onClick={async () => {
                setPropertyData(null);
                setResult(null);
                setError("");
                setInputs({
                  purchasePrice: 0,
                  downPayment: 0,
                  interestRate: 5.5,
                  loanTerm: 25,
                  monthlyRent: 0,
                  propertyTaxes: 0,
                  insurance: 0,
                  propertyManagement: 8,
                  maintenanceReserve: 7,
                  vacancy: 6,
                  capExReserve: 5,
                  hoaFees: 0,
                  otherExpenses: 0,
                });
                setDownPaymentPercentage(20);

                // Clear current calculation from storage
                await clearCurrentCalculation();

                // Also clear cached property data
                await chrome.storage.local.remove([
                  "currentPropertyData",
                  "lastUpdated",
                  "cachedUrl",
                  "extractionMethod",
                ]);
              }}
              sx={{
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 400,
                mr: 1,
                textTransform: "none",
                minWidth: "auto",
                padding: "6px 8px",
              }}
            >
              Clear
            </Button>
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
              <Box>
                We could not auto extract the data from this page. Please try{" "}
                <Box
                  component="span"
                  onClick={refreshCurrentPage}
                  sx={{
                    textDecoration: "underline",
                    cursor: "pointer",
                    color: "inherit",
                    "&:hover": {
                      textDecoration: "none",
                    },
                  }}
                >
                  refreshing the page
                </Box>
                .
              </Box>
            </Alert>
          )}

          {/* Auto Fill Button - Always at the top */}
          <Box sx={{ mb: 3 }}>
            <Button
              onClick={handleAIExtraction}
              disabled={extracting || loading}
              variant="contained"
              fullWidth
              startIcon={
                extracting ? <CircularProgress size={16} /> : <AutoAwesome />
              }
              sx={{
                backgroundColor: "#F59E0B",
                color: "#FFFFFF",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
                "&:hover": {
                  backgroundColor: "#D97706",
                  boxShadow: "0 4px 8px rgba(245, 158, 11, 0.4)",
                },
                "&:disabled": {
                  backgroundColor: "#9CA3AF",
                  boxShadow: "none",
                },
              }}
            >
              {extracting ? "Extracting..." : "Auto Fill Data"}
            </Button>
          </Box>

          {/* Property Information */}
          {propertyData && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
              >
                <Villa sx={{ mr: 1, fontSize: 18, color: "secondary.main" }} />
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
                  title={propertyData.address}
                  sx={{ mb: 1, fontWeight: 500, wordBreak: "break-word" }}
                >
                  {propertyData.address || "Address not available"}
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
                  {propertyData.sqft && (
                    <Chip
                      label={`${propertyData.sqft.toLocaleString()} sqft`}
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

            {/* Minimum Down Payment Alert */}
            {inputs.purchasePrice > 0 && isDownPaymentBelowMinimum && (
              <Alert
                severity="warning"
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  "& .MuiAlert-icon": {
                    color: "#F59E0B",
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Minimum Down Payment Required:{" "}
                  {formatCurrency(minimumDownPayment)} (
                  {minimumDownPaymentPercentage.toFixed(1)}%)
                  <Box
                    component="span"
                    sx={{ color: "#F59E0B", fontWeight: 600 }}
                  >
                    {" "}
                    • Current down payment is below CMHC minimum requirements
                  </Box>
                </Typography>
              </Alert>
            )}

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
              <>
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
                      result?.monthlyMortgage ||
                        (() => {
                          console.log(
                            `🔍 Alert Debug: purchasePrice=${inputs.purchasePrice}, downPayment=${inputs.downPayment}, interestRate=${inputs.interestRate}`
                          );
                          const baseMortgageAmount =
                            inputs.purchasePrice - inputs.downPayment;
                          const cmhc = calculateCMHCPremium(
                            baseMortgageAmount,
                            inputs.purchasePrice
                          );
                          const totalMortgageAmount =
                            baseMortgageAmount + cmhc.premium;
                          return calculateMortgagePayment(
                            totalMortgageAmount,
                            inputs.interestRate,
                            inputs.loanTerm
                          );
                        })()
                    )}
                    {(() => {
                      const baseMortgageAmount =
                        inputs.purchasePrice - inputs.downPayment;
                      const cmhc = calculateCMHCPremium(
                        baseMortgageAmount,
                        inputs.purchasePrice
                      );

                      if (cmhc.premium > 0) {
                        return (
                          <>
                            <br />
                            💰 CMHC Premium: {formatCurrency(cmhc.premium)} (
                            {cmhc.rate}% rate, {cmhc.ltv}% LTV) • Spread across
                            loan term
                          </>
                        );
                      }
                      return null;
                    })()}
                  </Typography>
                </Alert>
              </>
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

          {/* HOA Fees and Other Expenses */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Monthly HOA Fees"
              value={inputs.hoaFees}
              onChange={handleInputChange("hoaFees")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
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
                  {(result.cmhcPremium || 0) > 0 &&
                    (result.cmhcRate || 0) > 0 && (
                      <Box>
                        <Typography variant="body2" color="warning.main">
                          - CMHC Premium ({result.cmhcRate}% rate):
                        </Typography>
                        <Typography variant="body2" color="warning.main">
                          {formatCurrency(result.cmhcPremium || 0)} (added to
                          mortgage)
                        </Typography>
                      </Box>
                    )}
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
                        flexDirection: "column",
                        alignItems: "stretch",
                        p: 2,
                      }}
                    >
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600 }}
                        >
                          {calc.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          Cashflow:{" "}
                          {formatCurrency(calc.results.monthlyCashflow)}/month
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Saved: {formatDate(calc.savedAt)}
                        </Typography>
                        {calc.notes && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontStyle: "italic", mt: 0.5 }}
                          >
                            {calc.notes}
                          </Typography>
                        )}
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          justifyContent: "flex-end",
                        }}
                      >
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
                            <CalculateOutlined />
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
}

export default App;
