export interface PropertyData {
  price: number;
  address: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  url?: string;
  propertyTax?: number; // monthly
  insurance?: number; // monthly
  hoaFees?: number; // monthly
  monthlyRent?: number; // monthly rent
  interestRate?: number; // annual percentage
}

export interface CashflowInputs {
  purchasePrice: number;
  downPayment: number;
  interestRate: number;
  loanTerm: number; // years
  monthlyRent: number;
  propertyTaxes: number; // monthly
  insurance: number; // monthly
  propertyManagement: number; // percentage of rent
  maintenanceReserve: number; // percentage of rent
  vacancy: number; // percentage
  capExReserve: number; // percentage of rent (capital expenditures)
  hoaFees: number; // monthly
  otherExpenses: number; // monthly
}

export interface CashflowResult {
  monthlyMortgage: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  monthlyCashflow: number;
  annualCashflow: number;
  cashOnCashReturn: number; // percentage
  capRate: number; // percentage
  totalCashRequired: number;
}

export interface SavedCalculation {
  id: string;
  name: string;
  address: string;
  listingUrl?: string;
  inputs: CashflowInputs;
  results: CashflowResult;
  savedAt: number; // timestamp
  notes?: string;
}

export interface ChromeExtensionMessage {
  type:
    | "PROPERTY_DATA"
    | "CALCULATE_CASHFLOW"
    | "GET_PROPERTY_DATA"
    | "GET_PROPERTY_DATA_HTML"
    | "CAPTURE_SCREENSHOT"
    | "ANALYZE_HTML_CONTENT"
    | "ANALYZE_HTML_CONTENT_FINANCIALS";
  data?: any;
}
