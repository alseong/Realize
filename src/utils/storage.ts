import type {
  SavedCalculation,
  CashflowInputs,
  CashflowResult,
} from "../types/property";
import * as XLSX from "xlsx";

const STORAGE_KEY = "savedCalculations";

/**
 * Generate a unique ID for calculations
 */
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Get all saved calculations from storage
 */
export const getSavedCalculations = async (): Promise<SavedCalculation[]> => {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || [];
  } catch (error) {
    console.error("Error getting saved calculations:", error);
    return [];
  }
};

/**
 * Save a calculation to storage
 */
export const saveCalculation = async (
  name: string,
  address: string,
  listingUrl: string | undefined,
  inputs: CashflowInputs,
  results: CashflowResult,
  notes?: string
): Promise<SavedCalculation> => {
  try {
    const calculation: SavedCalculation = {
      id: generateId(),
      name,
      address,
      listingUrl,
      inputs,
      results,
      savedAt: Date.now(),
      notes,
    };

    const existingCalculations = await getSavedCalculations();
    const updatedCalculations = [calculation, ...existingCalculations];

    await chrome.storage.local.set({
      [STORAGE_KEY]: updatedCalculations,
    });

    console.log("✅ Calculation saved:", calculation.id);
    return calculation;
  } catch (error) {
    console.error("Error saving calculation:", error);
    throw error;
  }
};

/**
 * Delete a calculation from storage
 */
export const deleteCalculation = async (id: string): Promise<void> => {
  try {
    const existingCalculations = await getSavedCalculations();
    const updatedCalculations = existingCalculations.filter(
      (calc) => calc.id !== id
    );

    await chrome.storage.local.set({
      [STORAGE_KEY]: updatedCalculations,
    });

    console.log("✅ Calculation deleted:", id);
  } catch (error) {
    console.error("Error deleting calculation:", error);
    throw error;
  }
};

/**
 * Update a calculation in storage
 */
export const updateCalculation = async (
  id: string,
  updates: Partial<SavedCalculation>
): Promise<void> => {
  try {
    const existingCalculations = await getSavedCalculations();
    const updatedCalculations = existingCalculations.map((calc) =>
      calc.id === id ? { ...calc, ...updates } : calc
    );

    await chrome.storage.local.set({
      [STORAGE_KEY]: updatedCalculations,
    });

    console.log("✅ Calculation updated:", id);
  } catch (error) {
    console.error("Error updating calculation:", error);
    throw error;
  }
};

/**
 * Get a calculation by ID
 */
export const getCalculationById = async (
  id: string
): Promise<SavedCalculation | null> => {
  try {
    const calculations = await getSavedCalculations();
    return calculations.find((calc) => calc.id === id) || null;
  } catch (error) {
    console.error("Error getting calculation by ID:", error);
    return null;
  }
};

/**
 * Load a calculation into the app
 */
export const loadCalculation = (
  calculation: SavedCalculation,
  setInputs: (inputs: CashflowInputs) => void,
  setPropertyData: (data: any) => void
): void => {
  setInputs(calculation.inputs);
  setPropertyData({
    address: calculation.address,
    url: calculation.listingUrl,
    price: calculation.inputs.purchasePrice,
  });
};

/**
 * Format date for display
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Export saved calculations to Excel file
 */
export const exportToExcel = async (): Promise<void> => {
  try {
    const calculations = await getSavedCalculations();

    if (calculations.length === 0) {
      throw new Error("No saved calculations to export");
    }

    const workbook = XLSX.utils.book_new();

    // Create summary sheet
    const summaryData = [
      ["Property Analysis Summary", "", "", "", ""],
      ["Generated:", formatDate(Date.now()), "", "", ""],
      ["Total Properties:", calculations.length.toString(), "", "", ""],
      ["", "", "", "", ""],
      [
        "Property Name",
        "Address",
        "Monthly Cashflow",
        "Cap Rate",
        "Cash-on-Cash Return",
      ],
      ...calculations.map((calc) => [
        calc.name,
        calc.address,
        `$${calc.results.monthlyCashflow.toFixed(2)}`,
        `${calc.results.capRate.toFixed(2)}%`,
        `${calc.results.cashOnCashReturn.toFixed(2)}%`,
      ]),
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths for summary
    summarySheet["!cols"] = [
      { width: 25 }, // Property Name
      { width: 40 }, // Address
      { width: 15 }, // Monthly Cashflow
      { width: 12 }, // Cap Rate
      { width: 18 }, // Cash-on-Cash Return
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Create individual property sheets
    calculations.forEach((calc) => {
      const propertyData = [
        ["PROPERTY ANALYSIS REPORT", "", ""],
        ["", "", ""],
        ["Property Information", "", ""],
        ["Property Name:", calc.name, ""],
        ["Address:", calc.address, ""],
        ["Listing URL:", calc.listingUrl || "N/A", ""],
        ["Analysis Date:", formatDate(calc.savedAt), ""],
        ["Notes:", calc.notes || "N/A", ""],
        ["", "", ""],

        ["INVESTMENT INPUTS", "", ""],
        [
          "Purchase Price:",
          `$${calc.inputs.purchasePrice.toLocaleString()}`,
          "",
        ],
        ["Down Payment:", `$${calc.inputs.downPayment.toLocaleString()}`, ""],
        [
          "Loan Amount:",
          `$${(
            calc.inputs.purchasePrice - calc.inputs.downPayment
          ).toLocaleString()}`,
          "",
        ],
        ["Interest Rate:", `${calc.inputs.interestRate}%`, ""],
        ["Loan Term:", `${calc.inputs.loanTerm} years`, ""],
        ["", "", ""],

        ["INCOME", "", ""],
        ["Monthly Rent:", `$${calc.inputs.monthlyRent.toLocaleString()}`, ""],
        [
          "Annual Rent:",
          `$${(calc.inputs.monthlyRent * 12).toLocaleString()}`,
          "",
        ],
        ["", "", ""],

        ["EXPENSES (Annual)", "", ""],
        [
          "Property Taxes:",
          `$${calc.inputs.propertyTaxes.toLocaleString()}`,
          "",
        ],
        ["Insurance:", `$${calc.inputs.insurance.toLocaleString()}`, ""],
        [
          "Property Management:",
          `${calc.inputs.propertyManagement}% of rent`,
          `$${(
            (calc.inputs.monthlyRent * 12 * calc.inputs.propertyManagement) /
            100
          ).toLocaleString()}`,
        ],
        [
          "Maintenance Reserve:",
          `${calc.inputs.maintenanceReserve}% of rent`,
          `$${(
            (calc.inputs.monthlyRent * 12 * calc.inputs.maintenanceReserve) /
            100
          ).toLocaleString()}`,
        ],
        [
          "Vacancy Allowance:",
          `${calc.inputs.vacancy}% of rent`,
          `$${(
            (calc.inputs.monthlyRent * 12 * calc.inputs.vacancy) /
            100
          ).toLocaleString()}`,
        ],
        [
          "CapEx Reserve:",
          `${calc.inputs.capExReserve}% of rent`,
          `$${(
            (calc.inputs.monthlyRent * 12 * calc.inputs.capExReserve) /
            100
          ).toLocaleString()}`,
        ],
        [
          "Other Expenses:",
          `$${calc.inputs.otherExpenses.toLocaleString()}`,
          "",
        ],
        ["", "", ""],

        ["MONTHLY ANALYSIS", "", ""],
        ["Monthly Income:", `$${calc.results.monthlyIncome.toFixed(2)}`, ""],
        [
          "Monthly Mortgage (P&I):",
          `$${calc.results.monthlyMortgage.toFixed(2)}`,
          "",
        ],
        [
          "Monthly Operating Expenses:",
          `$${(
            calc.results.monthlyExpenses - calc.results.monthlyMortgage
          ).toFixed(2)}`,
          "",
        ],
        [
          "Total Monthly Expenses:",
          `$${calc.results.monthlyExpenses.toFixed(2)}`,
          "",
        ],
        [
          "NET MONTHLY CASHFLOW:",
          `$${calc.results.monthlyCashflow.toFixed(2)}`,
          calc.results.monthlyCashflow >= 0 ? "POSITIVE" : "NEGATIVE",
        ],
        ["", "", ""],

        ["ANNUAL ANALYSIS", "", ""],
        ["Annual Cashflow:", `$${calc.results.annualCashflow.toFixed(2)}`, ""],
        [
          "Cash-on-Cash Return:",
          `${calc.results.cashOnCashReturn.toFixed(2)}%`,
          "",
        ],
        ["Cap Rate:", `${calc.results.capRate.toFixed(2)}%`, ""],
        [
          "Total Cash Required:",
          `$${calc.results.totalCashRequired.toLocaleString()}`,
          "",
        ],
        ["", "", ""],

        ["EXPENSE BREAKDOWN (Monthly)", "", ""],
        [
          "Mortgage Payment:",
          `$${calc.results.monthlyMortgage.toFixed(2)}`,
          "",
        ],
        [
          "Property Taxes:",
          `$${(calc.inputs.propertyTaxes / 12).toFixed(2)}`,
          "",
        ],
        ["Insurance:", `$${(calc.inputs.insurance / 12).toFixed(2)}`, ""],
        [
          "Property Management:",
          `$${(
            (calc.inputs.monthlyRent * calc.inputs.propertyManagement) /
            100
          ).toFixed(2)}`,
          "",
        ],
        [
          "Maintenance Reserve:",
          `$${(
            (calc.inputs.monthlyRent * calc.inputs.maintenanceReserve) /
            100
          ).toFixed(2)}`,
          "",
        ],
        [
          "Vacancy Allowance:",
          `$${((calc.inputs.monthlyRent * calc.inputs.vacancy) / 100).toFixed(
            2
          )}`,
          "",
        ],
        [
          "CapEx Reserve:",
          `$${(
            (calc.inputs.monthlyRent * calc.inputs.capExReserve) /
            100
          ).toFixed(2)}`,
          "",
        ],
        [
          "Other Expenses:",
          `$${(calc.inputs.otherExpenses / 12).toFixed(2)}`,
          "",
        ],
        ["TOTAL EXPENSES:", `$${calc.results.monthlyExpenses.toFixed(2)}`, ""],
      ];

      const propertySheet = XLSX.utils.aoa_to_sheet(propertyData);

      // Set column widths
      propertySheet["!cols"] = [
        { width: 25 }, // Label
        { width: 20 }, // Value
        { width: 15 }, // Additional info
      ];

      // Create a safe sheet name (max 31 characters, no special chars)
      let sheetName = calc.name.replace(/[\/\\\?\*\[\]]/g, "").substring(0, 28);
      if (sheetName.length < calc.name.length) {
        sheetName += "...";
      }

      // Ensure unique sheet names
      let finalSheetName = sheetName;
      let counter = 1;
      while (workbook.SheetNames.includes(finalSheetName)) {
        finalSheetName = `${sheetName.substring(0, 25)}_${counter}`;
        counter++;
      }

      XLSX.utils.book_append_sheet(workbook, propertySheet, finalSheetName);
    });

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true,
    });

    // Create blob and download
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Property_Analysis_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log("✅ Excel file exported successfully");
  } catch (error) {
    console.error("❌ Error exporting to Excel:", error);
    throw error;
  }
};
