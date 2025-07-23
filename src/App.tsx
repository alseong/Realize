import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import {
  CalculateOutlined,
  ExpandMoreOutlined,
  HomeOutlined,
  AttachMoneyOutlined,
  TrendingUpOutlined,
} from "@mui/icons-material";

import type {
  PropertyData,
  CashflowInputs,
  CashflowResult,
} from "./types/property";
import {
  calculateCashflow,
  formatCurrency,
  formatPercentage,
} from "./utils/cashflow";

// Create Material UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#2196F3",
    },
    secondary: {
      main: "#4CAF50",
    },
  },
  typography: {
    fontSize: 12,
  },
  components: {
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
    MuiButton: {
      defaultProps: {
        size: "small",
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

  // Cashflow input state
  const [inputs, setInputs] = useState<CashflowInputs>({
    purchasePrice: 0,
    downPayment: 0,
    interestRate: 5.5,
    loanTerm: 25,
    monthlyRent: 0,
    propertyTaxes: 0,
    insurance: 0,
    maintenance: 0,
    propertyManagement: 0,
    vacancy: 5,
    otherExpenses: 0,
  });

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
            maintenance: Math.round(
              propData.price *
                ((result.defaultSettings?.maintenanceRate || 1.0) / 100)
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
                    'No property data found. Please visit a Realtor.ca listing page and click the "Calculate Cashflow" button.'
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

  const handleInputChange =
    (field: keyof CashflowInputs) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(event.target.value) || 0;
      setInputs((prev) => ({ ...prev, [field]: value }));

      // Auto-calculate property management fee based on rent
      if (field === "monthlyRent") {
        setInputs((prev) => ({
          ...prev,
          monthlyRent: value,
          propertyManagement: Math.round(value * 12 * 0.08), // 8% of annual rent
        }));
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

  const getCashflowColor = (cashflow: number) => {
    if (cashflow > 0) return "success";
    if (cashflow < 0) return "error";
    return "warning";
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
      <Box sx={{ width: 400, maxHeight: 600, overflow: "auto" }}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <CalculateOutlined sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h6" component="h1">
                Cashflow Calculator
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Property Information */}
            {propertyData && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <HomeOutlined sx={{ mr: 1, fontSize: 16 }} />
                  Property Details
                </Typography>
                <Card variant="outlined" sx={{ p: 1.5 }}>
                  <Typography
                    variant="body2"
                    noWrap
                    title={propertyData.address}
                  >
                    <strong>{propertyData.address}</strong>
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
                      color="primary"
                    />
                    <Chip label={propertyData.propertyType} size="small" />
                    {propertyData.bedrooms && (
                      <Chip
                        label={`${propertyData.bedrooms} bed`}
                        size="small"
                      />
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
              sx={{ display: "flex", alignItems: "center" }}
            >
              <AttachMoneyOutlined sx={{ mr: 1, fontSize: 16 }} />
              Investment Details
            </Typography>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}
            >
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
                  onChange={handleInputChange("downPayment")}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1 }}
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
                      <InputAdornment position="end">years</InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1 }}
                />
              </Box>
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

            {/* Advanced Inputs - Accordion */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
                <Typography variant="body2">Advanced Expenses</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      label="Property Taxes"
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
                      label="Insurance"
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
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      label="Maintenance"
                      value={inputs.maintenance}
                      onChange={handleInputChange("maintenance")}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">$</InputAdornment>
                        ),
                      }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Property Mgmt"
                      value={inputs.propertyManagement}
                      onChange={handleInputChange("propertyManagement")}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">$</InputAdornment>
                        ),
                      }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      label="Vacancy Rate"
                      value={inputs.vacancy}
                      onChange={handleInputChange("vacancy")}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">%</InputAdornment>
                        ),
                      }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Other Expenses"
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
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Calculate Button */}
            <Button
              variant="contained"
              onClick={handleCalculate}
              disabled={calculating || inputs.purchasePrice === 0}
              startIcon={
                calculating ? (
                  <CircularProgress size={16} />
                ) : (
                  <TrendingUpOutlined />
                )
              }
              fullWidth
              sx={{ mt: 2, mb: 2 }}
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

                {/* Detailed Breakdown */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
                    <Typography variant="body2">Monthly Breakdown</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
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
                        <Typography variant="body2">
                          Monthly Expenses:
                        </Typography>
                        <Typography variant="body2" color="error.main">
                          {formatCurrency(result.monthlyExpenses)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2">
                          - Mortgage Payment:
                        </Typography>
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
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
};

export default App;
