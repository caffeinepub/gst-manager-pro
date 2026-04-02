// GST Application Types - localStorage managed entities

export type InvoiceStatus = "draft" | "confirmed" | "cancelled";
export type InvoiceType =
  | "sales"
  | "service"
  | "einvoice"
  | "quotation"
  | "proforma"
  | "eway_bill"
  | "credit_note"
  | "debit_note"
  | "bill_of_supply"
  | "delivery_challan";
export type PaymentMode = "cash" | "bank" | "upi" | "cheque" | "neft_rtgs";
export type JournalEntryType = "debit" | "credit";

export interface InvoiceLineItem {
  id: string;
  itemId: string;
  description: string;
  hsnSacCode: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cessPercent: number;
  cess: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  type: InvoiceType;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  partyId: string;
  partyName: string;
  partyGstin: string;
  placeOfSupply: string;
  placeOfSupplyName: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  grandTotal: number;
  irnNumber: string;
  eWayBillNumber: string;
  vehicleNumber?: string;
  transporter?: string;
  distanceKm?: number;
  linkedInvoiceId?: string;
  linkedInvoiceNumber?: string;
  creditDebitReason?: string;
  challanPurpose?: string;
  driverName?: string;
  validityDate?: string;
  quotationTerms?: string;
  notes: string;
  termsConditions: string;
  declaration?: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  partyName: string;
  amount: number;
  date: string;
  mode: PaymentMode;
  reference: string;
  notes: string;
  type: "received" | "paid";
  createdAt: string;
}

export interface Purchase {
  id: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  grandTotal: number;
  isRcm: boolean;
  itcEligible: boolean;
  status: InvoiceStatus;
  expenseCategory?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  type: JournalEntryType;
  amount: number;
  narration: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  reference: string;
  narration: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  openingBalance: number;
  accountType: "savings" | "current" | "cash";
  isActive: boolean;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
  reconciled?: boolean;
  createdAt: string;
}

export interface CashTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "receipt" | "payment";
  balance: number;
  reference: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "view"
    | "export"
    | "file"
    | "cancel"
    | "approve";
  entity: string;
  entityId: string;
  description: string;
  timestamp: string;
}

export interface ApiSettings {
  gstn: {
    key: string;
    url: string;
    clientId: string;
    clientSecret: string;
    enabled: boolean;
  };
  pan: { key: string; url: string; enabled: boolean };
  banking: {
    key: string;
    url: string;
    bankName: string;
    accountId: string;
    enabled: boolean;
  };
  sms: { provider: string; key: string; senderId: string; enabled: boolean };
}

// Indian States with GST codes
export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman & Diu" },
  { code: "26", name: "Dadra & Nagar Haveli" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (Old)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

export const GST_RATES = [
  0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 9, 12, 14, 18, 28,
];

export const UNITS = [
  "Nos",
  "Kgs",
  "Ltrs",
  "Mtrs",
  "Sqft",
  "Hrs",
  "Days",
  "Months",
  "Box",
  "Carton",
  "Dozen",
  "Pair",
];

// Chart of Accounts (simplified)
export const CHART_OF_ACCOUNTS = [
  { code: "1001", name: "Cash in Hand", type: "asset" },
  { code: "1002", name: "Bank Account", type: "asset" },
  { code: "1101", name: "Trade Receivables", type: "asset" },
  { code: "1102", name: "Input Tax Credit - CGST", type: "asset" },
  { code: "1103", name: "Input Tax Credit - SGST", type: "asset" },
  { code: "1104", name: "Input Tax Credit - IGST", type: "asset" },
  { code: "1201", name: "Inventory", type: "asset" },
  { code: "2001", name: "Trade Payables", type: "liability" },
  { code: "2101", name: "GST Payable - CGST", type: "liability" },
  { code: "2102", name: "GST Payable - SGST", type: "liability" },
  { code: "2103", name: "GST Payable - IGST", type: "liability" },
  { code: "2104", name: "GST Payable - Cess", type: "liability" },
  { code: "2201", name: "TDS Payable", type: "liability" },
  { code: "3001", name: "Capital Account", type: "equity" },
  { code: "3002", name: "Retained Earnings", type: "equity" },
  { code: "4001", name: "Sales Revenue", type: "income" },
  { code: "4002", name: "Service Revenue", type: "income" },
  { code: "4003", name: "Other Income", type: "income" },
  { code: "5001", name: "Cost of Goods Sold", type: "expense" },
  { code: "5002", name: "Purchase - Raw Material", type: "expense" },
  { code: "5101", name: "Salaries & Wages", type: "expense" },
  { code: "5102", name: "Rent", type: "expense" },
  { code: "5103", name: "Utilities", type: "expense" },
  { code: "5104", name: "Depreciation", type: "expense" },
  { code: "5201", name: "Marketing & Advertising", type: "expense" },
  { code: "5202", name: "Travel & Conveyance", type: "expense" },
  { code: "5203", name: "Professional Fees", type: "expense" },
  { code: "5204", name: "Miscellaneous Expenses", type: "expense" },
];

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  sales: "Sales Invoice",
  service: "Service Invoice",
  einvoice: "e-Invoice",
  quotation: "Quotation",
  proforma: "Proforma Invoice",
  eway_bill: "e-Way Bill",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  bill_of_supply: "Bill of Supply",
  delivery_challan: "Delivery Challan",
};

export type AppPage =
  | "dashboard"
  | "masters-profile"
  | "masters-parties"
  | "masters-items"
  | "masters-taxrates"
  | "invoicing-sales"
  | "invoicing-service"
  | "invoicing-einvoice"
  | "invoicing-quotations"
  | "invoicing-proforma"
  | "invoicing-eway-bill"
  | "invoicing-credit-notes"
  | "invoicing-debit-notes"
  | "invoicing-bill-of-supply"
  | "invoicing-delivery-challans"
  | "invoicing-all"
  | "invoicing-payments"
  | "accounting-purchases"
  | "accounting-journal"
  | "accounting-bank"
  | "accounting-cashbook"
  | "gst-gstr1"
  | "gst-gstr3b"
  | "gst-itc"
  | "gst-rcm"
  | "gst-audit"
  | "reports-sales"
  | "reports-purchase"
  | "reports-gst-summary"
  | "reports-ar-ageing"
  | "reports-ap-ageing"
  | "reports-trial-balance"
  | "reports-pl"
  | "reports-balance-sheet"
  | "reports-stock"
  | "reports-cashflow"
  | "accounting-reconciliation"
  | "accounting-chart-of-accounts"
  | "inventory-erp"
  | "ai-assistant"
  | "gst-api-integration"
  | "workflow-automation"
  | "backup-restore"
  | "settings-api-config"
  | "settings-ocr"
  | "settings-preferences"
  | "settings-import"
  | "uat-dashboard";
