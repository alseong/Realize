import type { CashflowInputs, CashflowResult } from "../types/property";

/**
 * Calculate monthly mortgage payment using the standard mortgage formula
 */
export const calculateMortgagePayment = (
  principal: number,
  annualRate: number,
  years: number
): number => {
  if (annualRate === 0) return principal / (years * 12);

  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;

  const monthlyPayment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return monthlyPayment;
};

/**
 * Calculate comprehensive cashflow analysis for a rental property
 */
export const calculateCashflow = (inputs: CashflowInputs): CashflowResult => {
  const {
    purchasePrice,
    downPayment,
    interestRate,
    loanTerm,
    monthlyRent,
    propertyTaxes,
    insurance,
    maintenance,
    propertyManagement,
    vacancy,
    otherExpenses,
  } = inputs;

  // Calculate loan amount
  const loanAmount = purchasePrice - downPayment;

  // Calculate monthly mortgage payment
  const monthlyMortgage =
    loanAmount > 0
      ? calculateMortgagePayment(loanAmount, interestRate, loanTerm)
      : 0;

  // Calculate monthly expenses
  const monthlyPropertyTaxes = propertyTaxes / 12;
  const monthlyInsurance = insurance / 12;
  const monthlyMaintenance = maintenance / 12;
  const monthlyPropertyManagement = propertyManagement / 12;
  const monthlyOtherExpenses = otherExpenses / 12;

  const monthlyExpenses =
    monthlyMortgage +
    monthlyPropertyTaxes +
    monthlyInsurance +
    monthlyMaintenance +
    monthlyPropertyManagement +
    monthlyOtherExpenses;

  // Calculate effective monthly income (accounting for vacancy)
  const effectiveMonthlyIncome = monthlyRent * (1 - vacancy / 100);

  // Calculate monthly cashflow
  const monthlyCashflow = effectiveMonthlyIncome - monthlyExpenses;
  const annualCashflow = monthlyCashflow * 12;

  // Calculate cash-on-cash return (annual cashflow / total cash invested)
  const totalCashRequired = downPayment; // Could include closing costs, repairs, etc.
  const cashOnCashReturn =
    totalCashRequired > 0 ? (annualCashflow / totalCashRequired) * 100 : 0;

  // Calculate cap rate (NOI / purchase price)
  // NOI = rental income - operating expenses (excluding mortgage)
  const annualOperatingExpenses =
    propertyTaxes +
    insurance +
    maintenance +
    propertyManagement +
    otherExpenses;
  const noi = monthlyRent * 12 * (1 - vacancy / 100) - annualOperatingExpenses;
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;

  return {
    monthlyMortgage: Math.round(monthlyMortgage * 100) / 100,
    monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
    monthlyIncome: Math.round(effectiveMonthlyIncome * 100) / 100,
    monthlyCashflow: Math.round(monthlyCashflow * 100) / 100,
    annualCashflow: Math.round(annualCashflow * 100) / 100,
    cashOnCashReturn: Math.round(cashOnCashReturn * 100) / 100,
    capRate: Math.round(capRate * 100) / 100,
    totalCashRequired: Math.round(totalCashRequired * 100) / 100,
  };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
};

/**
 * Format percentage for display
 */
export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(2)}%`;
};
