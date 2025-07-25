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
 * Formula: Monthly Cash Flow = Monthly Rental Income - Monthly Expenses
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
    propertyManagement,
    maintenanceReserve,
    vacancy,
    capExReserve,
    hoaFees,
    otherExpenses,
  } = inputs;

  // Calculate loan amount
  const loanAmount = purchasePrice - downPayment;

  // Calculate CMHC premium and total mortgage amount
  const cmhc = calculateCMHCPremium(loanAmount, purchasePrice);
  const totalMortgageAmount = loanAmount + cmhc.premium;

  // Debug logging
  console.log(
    `🔍 Mortgage Debug: loanAmount=${loanAmount}, cmhcPremium=${cmhc.premium}, totalMortgageAmount=${totalMortgageAmount}, interestRate=${interestRate}%, loanTerm=${loanTerm} years`
  );

  // Calculate monthly mortgage payment (principal + interest) including CMHC premium
  const monthlyMortgage =
    totalMortgageAmount > 0
      ? calculateMortgagePayment(totalMortgageAmount, interestRate, loanTerm)
      : 0;

  console.log(`🔍 Monthly Mortgage Payment: ${monthlyMortgage}`);

  // Monthly Rental Income (gross rent)
  const monthlyRentalIncome = monthlyRent;

  // Calculate Monthly Expenses:
  // 1. Mortgage payment (P&I)
  // 2. Property taxes (already monthly)
  const monthlyPropertyTaxes = propertyTaxes;
  // 3. Insurance (already monthly)
  const monthlyInsurance = insurance;
  // 4. Property management (% of rent)
  const monthlyPropertyManagement = monthlyRent * (propertyManagement / 100);
  // 5. Maintenance reserve (% of rent)
  const monthlyMaintenanceReserve = monthlyRent * (maintenanceReserve / 100);
  // 6. Vacancy allowance (% of rent) - this reduces effective income
  const monthlyVacancyAllowance = monthlyRent * (vacancy / 100);
  // 7. Capital expenditure reserve (% of rent)
  const monthlyCapExReserve = monthlyRent * (capExReserve / 100);
  // 8. HOA fees (monthly)
  const monthlyHoaFees = hoaFees;
  // 9. Other expenses (monthly)
  const monthlyOtherExpenses = otherExpenses;

  // Total Monthly Expenses
  const monthlyExpenses =
    monthlyMortgage +
    monthlyPropertyTaxes +
    monthlyInsurance +
    monthlyPropertyManagement +
    monthlyMaintenanceReserve +
    monthlyVacancyAllowance +
    monthlyCapExReserve +
    monthlyHoaFees +
    monthlyOtherExpenses;

  // Monthly Cash Flow = Monthly Rental Income - Monthly Expenses
  const monthlyCashflow = monthlyRentalIncome - monthlyExpenses;
  const annualCashflow = monthlyCashflow * 12;

  // Calculate cash-on-cash return (annual cashflow / total cash invested)
  const totalCashRequired = downPayment;
  const cashOnCashReturn =
    totalCashRequired > 0 ? (annualCashflow / totalCashRequired) * 100 : 0;

  // Calculate cap rate (NOI / purchase price)
  // NOI = rental income - operating expenses (excluding mortgage and vacancy)
  const annualOperatingExpenses =
    propertyTaxes * 12 +
    insurance * 12 +
    monthlyPropertyManagement * 12 +
    monthlyMaintenanceReserve * 12 +
    monthlyCapExReserve * 12 +
    hoaFees * 12 +
    otherExpenses * 12;

  const grossAnnualIncome = monthlyRent * 12;
  const effectiveAnnualIncome =
    grossAnnualIncome - monthlyVacancyAllowance * 12;
  const noi = effectiveAnnualIncome - annualOperatingExpenses;
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;

  return {
    monthlyMortgage: Math.round(monthlyMortgage * 100) / 100,
    monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
    monthlyIncome: Math.round(monthlyRentalIncome * 100) / 100,
    monthlyCashflow: Math.round(monthlyCashflow * 100) / 100,
    annualCashflow: Math.round(annualCashflow * 100) / 100,
    cashOnCashReturn: Math.round(cashOnCashReturn * 100) / 100,
    capRate: Math.round(capRate * 100) / 100,
    totalCashRequired: Math.round(totalCashRequired * 100) / 100,
    cmhcPremium: cmhc.premium,
    cmhcRate: cmhc.rate,
    cmhcLtv: cmhc.ltv,
    totalMortgageAmount: Math.round(totalMortgageAmount * 100) / 100,
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

/**
 * Calculate minimum down payment based on Canada's mortgage rules
 *
 * Purchase Price Under $500,000: 5% minimum
 * Purchase Price $500,000 - $999,999: 5% on first $500K + 10% on portion above $500K
 * Purchase Price $1,000,000+: 20% minimum
 */
export const calculateMinimumDownPayment = (purchasePrice: number): number => {
  if (purchasePrice <= 0) return 0;

  if (purchasePrice < 500000) {
    // Under $500,000: 5% minimum
    return purchasePrice * 0.05;
  } else if (purchasePrice < 1000000) {
    // $500,000 - $999,999: 5% on first $500K + 10% on portion above $500K
    const first500k = 500000 * 0.05;
    const remainingAmount = purchasePrice - 500000;
    const remaining10Percent = remainingAmount * 0.1;
    return first500k + remaining10Percent;
  } else {
    // $1,000,000+: 20% minimum
    return purchasePrice * 0.2;
  }
};

/**
 * Calculate down payment percentage based on dollar amount and purchase price
 */
export const calculateDownPaymentPercentage = (
  downPayment: number,
  purchasePrice: number
): number => {
  if (purchasePrice <= 0) return 0;
  return (downPayment / purchasePrice) * 100;
};

/**
 * Calculate down payment dollar amount based on percentage and purchase price
 */
export const calculateDownPaymentAmount = (
  percentage: number,
  purchasePrice: number
): number => {
  return (purchasePrice * percentage) / 100;
};

/**
 * Calculate CMHC premium for high-ratio mortgages (LTV > 80%)
 *
 * Premium Rates for Over 80% LTV:
 * 80.01% to 85% LTV: 2.80% of total loan amount
 * 85.01% to 90% LTV: 3.10% of total loan amount
 * 90.01% to 95% LTV: 4.00% of total loan amount
 * 90.01% to 95% LTV with non-traditional down payment: 4.50% of total loan amount
 */
export const calculateCMHCPremium = (
  mortgageAmount: number,
  purchasePrice: number
): { premium: number; rate: number; ltv: number } => {
  if (purchasePrice <= 0 || mortgageAmount <= 0) {
    return { premium: 0, rate: 0, ltv: 0 };
  }

  const ltv = (mortgageAmount / purchasePrice) * 100;

  // Debug logging
  console.log(
    `🔍 CMHC Debug: mortgageAmount=${mortgageAmount}, purchasePrice=${purchasePrice}, LTV=${ltv}%`
  );

  // Only apply premium if LTV > 80% (with small tolerance for floating point precision)
  if (ltv <= 80.001) {
    console.log(`✅ No CMHC premium - LTV ${ltv}% <= 80.001%`);
    return { premium: 0, rate: 0, ltv };
  }

  let premiumRate = 0;

  if (ltv <= 85) {
    premiumRate = 2.8;
  } else if (ltv <= 90) {
    premiumRate = 3.1;
  } else if (ltv <= 95) {
    // Using standard rate (4.00%) - could be enhanced to detect non-traditional down payment
    premiumRate = 4.0;
  } else {
    // LTV > 95% - maximum premium rate
    premiumRate = 4.5;
  }

  const premium = mortgageAmount * (premiumRate / 100);

  return {
    premium: Math.round(premium * 100) / 100,
    rate: premiumRate,
    ltv: Math.round(ltv * 100) / 100,
  };
};

/**
 * Calculate total mortgage amount including CMHC premium
 */
export const calculateTotalMortgageAmount = (
  baseMortgageAmount: number,
  purchasePrice: number
): { totalAmount: number; premium: number; rate: number; ltv: number } => {
  const cmhc = calculateCMHCPremium(baseMortgageAmount, purchasePrice);

  return {
    totalAmount: baseMortgageAmount + cmhc.premium,
    premium: cmhc.premium,
    rate: cmhc.rate,
    ltv: cmhc.ltv,
  };
};
