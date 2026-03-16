import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useInvoices, usePurchases } from "@/hooks/useGSTStore";
import {
  formatINR,
  getGSTR1DueDate,
  getGSTR3BDueDate,
} from "@/utils/formatting";
import {
  Bot,
  Calendar,
  Lightbulb,
  MessageSquare,
  Send,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const GST_QA: Array<{ keywords: string[]; question: string; answer: string }> =
  [
    {
      keywords: ["what is gst", "gst meaning", "gst full form"],
      question: "What is GST?",
      answer: `**Goods and Services Tax (GST)** is a comprehensive indirect tax levied on the supply of goods and services in India. It replaced multiple central and state taxes. GST is of 4 types:

• **CGST** - Central GST (collected by Centre for intrastate supply)
• **SGST** - State GST (collected by State for intrastate supply)  
• **IGST** - Integrated GST (collected by Centre for interstate supply)
• **Cess** - Additional levy on luxury/sin goods

GST rates: 0%, 5%, 12%, 18%, 28%`,
    },
    {
      keywords: ["gstr-1", "gstr1", "when is gstr1 due", "gstr 1 due date"],
      question: "When is GSTR-1 due?",
      answer: `**GSTR-1** is due on the **11th of the following month** for monthly filers.

📅 Next due date: **${getGSTR1DueDate()}**

GSTR-1 contains details of all outward supplies (sales). For quarterly filers (under QRMP scheme), it's due by the 13th of the month following the quarter.

Key points:
• Contains B2B, B2C, credit notes, debit notes
• Required for ITC claims by your buyers
• Late filing attracts ₹50-200 per day penalty`,
    },
    {
      keywords: ["gstr-3b", "gstr3b", "gstr 3b due date", "when is gstr3b"],
      question: "When is GSTR-3B due?",
      answer: `**GSTR-3B** is due on the **20th of the following month**.

📅 Next due date: **${getGSTR3BDueDate()}**

GSTR-3B is a summary return for:
• Outward supplies (sales) tax liability
• Input Tax Credit (ITC) claimed
• Net tax payable

Late fee: ₹50/day (₹20/day for nil return). Interest @18% p.a. on late payment.`,
    },
    {
      keywords: ["itc", "input tax credit", "what is itc"],
      question: "What is ITC (Input Tax Credit)?",
      answer: `**Input Tax Credit (ITC)** allows you to claim the GST paid on your purchases against your GST liability on sales.

**Example:** If you paid ₹1,800 GST on purchases and collected ₹5,000 GST on sales, you pay only ₹3,200 net.

**Eligibility conditions:**
1. Supplier must have filed GSTR-1
2. Invoice should appear in GSTR-2B
3. Payment to supplier within 180 days
4. Goods/services used for business purposes

**Blocked credits (Section 17(5)):**
• Motor vehicles (certain cases)
• Food & beverages
• Club memberships
• Personal use items`,
    },
    {
      keywords: [
        "cgst vs igst",
        "cgst sgst igst difference",
        "difference between cgst sgst igst",
      ],
      question: "What's the difference between CGST, SGST, and IGST?",
      answer: `**CGST vs SGST vs IGST:**

| Type | Full Form | When Applied | Rate |
|------|-----------|-------------|------|
| CGST | Central GST | Intrastate sales | Half of GST rate |
| SGST | State GST | Intrastate sales | Half of GST rate |
| IGST | Integrated GST | Interstate sales | Full GST rate |

**Example (18% GST):**
• Intrastate sale: CGST 9% + SGST 9%
• Interstate sale: IGST 18%`,
    },
    {
      keywords: ["rcm", "reverse charge", "what is rcm"],
      question: "What is RCM (Reverse Charge Mechanism)?",
      answer: `**Reverse Charge Mechanism (RCM)** shifts the GST payment liability from the supplier to the recipient.

**When RCM applies:**
• Import of services
• Purchases from unregistered dealers (above ₹5,000/day aggregate)
• Specific notified goods/services (legal services, GTA, etc.)

**Key rules:**
• Recipient must self-invoice the supply
• ITC of RCM tax is available only after payment
• Cannot use ITC to pay RCM tax — must pay in cash`,
    },
    {
      keywords: ["e-invoice", "einvoice", "irn", "e invoice threshold"],
      question: "What is e-Invoice and what is the threshold?",
      answer: `**e-Invoice (Electronic Invoice)** is mandatory for B2B transactions above the threshold.

**Current threshold:** Businesses with turnover > **₹5 crore** (from August 2023)

**How it works:**
1. Generate invoice in your software
2. Upload to IRP (Invoice Registration Portal)
3. IRP validates and returns **IRN** (Invoice Reference Number) + **QR Code**
4. IRN is unique 64-character hash

**Penalty for non-compliance:** Invoice is invalid for ITC; penalty up to 100% of tax`,
    },
    {
      keywords: ["e-way bill", "eway", "e way bill"],
      question: "What is e-Way Bill?",
      answer: `**e-Way Bill** is an electronic permit for goods movement valued above **₹50,000**.

**Validity:**
• Up to 100 km: 1 day
• Every additional 100 km: +1 day

**When required:**
• Inter-state or intra-state movement
• Value > ₹50,000 (consignment)

**Parts:**
• Part A: Invoice details (shipper)
• Part B: Vehicle details (transporter)

**Penalty:** ₹10,000 or tax amount (whichever is higher)`,
    },
    {
      keywords: ["composition scheme", "composition dealer"],
      question: "What is Composition Scheme?",
      answer: `**Composition Scheme** is a simplified GST scheme for small businesses.

**Eligibility:** Annual turnover up to **₹1.5 crore** (₹75 lakh for special category states)

**Rates:**
• Traders/Manufacturers: 1% (0.5% CGST + 0.5% SGST)
• Restaurants: 5%
• Service providers: 6% (under CGST Notification 2/2019)

**Restrictions:**
• Cannot claim ITC
• Cannot issue tax invoices
• Cannot make inter-state supplies
• Cannot supply exempted goods`,
    },
    {
      keywords: ["tds under gst", "tds gst", "section 51"],
      question: "What is TDS under GST?",
      answer: `**TDS under GST (Section 51)** applies to specified notified persons:

**Who deducts:** Government departments, PSUs, local authorities, certain private companies

**Rate:** 2% (1% CGST + 1% SGST/IGST) on payments above ₹2.5 lakh

**Not applicable to:** Composition suppliers, exempt supplies, metal/ore

**Due date for deposit:** 10th of next month
**Return (GSTR-7):** 10th of next month`,
    },
    {
      keywords: [
        "export invoice",
        "export gst",
        "letter of undertaking",
        "lut",
      ],
      question: "What are the rules for Export Invoices?",
      answer: `**Exports under GST are Zero-Rated (Section 16 of IGST Act)**

**Two options:**
1. **Export with LUT/Bond** (no tax paid) — claim IGST refund on inputs
2. **Export with payment of IGST** — claim IGST refund on export invoice

**LUT (Letter of Undertaking):**
• File online on GST portal annually
• Valid for FY in which filed
• Required for registered exporters

**Invoice must mention:** "Supply Meant for Export under LUT/Bond without payment of IGST"`,
    },
    {
      keywords: ["blocked itc", "section 17", "ineligible itc"],
      question: "What is Blocked ITC under Section 17(5)?",
      answer: `**Blocked ITC (Section 17(5))** — these credits CANNOT be claimed:

• Motor vehicles (except for supply/training/transportation business)
• Food, beverages, outdoor catering
• Beauty treatment, health services
• Membership of clubs/health & fitness
• Rent-a-cab (unless obligatory for employer)
• Life/health insurance (except statutory obligation)
• Works contract for immovable property
• Construction of immovable property for own use
• Goods/services for personal use`,
    },
    {
      keywords: ["gstr-9", "annual return", "gstr9"],
      question: "What is GSTR-9 (Annual Return)?",
      answer: `**GSTR-9** is the Annual Return consolidating all monthly/quarterly returns.

**Due date:** **31st December** of the following financial year

**Mandatory for:** Businesses with turnover > ₹2 crore

**Contains:**
• Summary of all outward/inward supplies
• ITC availed and reversed
• Tax paid details
• Demand/refund proceedings

**GSTR-9C** (Reconciliation Statement) mandatory for turnover > ₹5 crore`,
    },
    {
      keywords: ["workflow automation", "automated reminders", "workflow"],
      question: "How does Workflow Automation work?",
      answer: `**Workflow Automation** in GST Manager Pro provides 8 automated reminders:

1. **GSTR-1 Filing Reminder** — 5 days before 11th of month
2. **GSTR-3B Filing Reminder** — 5 days before 20th of month
3. **Overdue Invoice Alerts** — Daily scan at 9 AM
4. **Low Stock Notifications** — When closing stock ≤ 5 units
5. **RCM Payment Reminders** — 25th of each month
6. **ITC Reconciliation Reminder** — 14th of each month (GSTR-2B publish date)
7. **Bank Reconciliation Reminder** — last working day of month
8. **GSTR-9 Annual Return Reminder** — 1st November each year

Each workflow can be individually **enabled/disabled** and manually triggered with "Run Now". Status and last-run time are persisted locally.`,
    },
    {
      keywords: [
        "gstin validate",
        "validate gstin",
        "gstin lookup",
        "pan validate",
      ],
      question: "How do I validate a GSTIN or PAN?",
      answer: `**GSTIN Validation** is available in two places:

**1. Masters → Parties (inline validation):**
• When adding/editing a party, click the **"Validate"** button next to the GSTIN field
• Shows: Legal Name | Status: Active | Type: Regular
• Validates the 15-character format (2 state digits + 5 alpha + 4 digits + 1 alpha + 1 alpha + Z + 1 alphanumeric)

**2. GST Compliance → API Integration:**
• Full GSTIN validation card with endpoint URL
• PAN Validation card — validates 10-char PAN format and returns taxpayer name + type (Individual/Company)
• Banking Sync, e-Invoice IRN, and e-Way Bill test cards

**Note:** These are simulated API calls. In production, they connect to the official GSTN and NSDL APIs with your API credentials.`,
    },
    {
      keywords: ["voice invoice", "speak invoice", "voice entry"],
      question: "How does Voice Invoice work?",
      answer: `**Voice Invoice (Beta)** is available in **Sales Invoice** and **Service Invoice** forms.

**How to use:**
1. Open a Sales or Service invoice form
2. Click the **"Voice"** button (microphone icon) in the header
3. A dialog appears with an animated mic icon and "Listening..." status
4. After 2 seconds, the system auto-fills:
   • Party: first available party in your masters
   • Line Item: "Voice Captured Item" | Qty: 1 | Price: ₹5,000 | GST: 18%
5. Review and edit the pre-filled details as needed

**Current status:** Beta simulation — actual speech recognition requires microphone permission and will be connected to Web Speech API in the production release.

**Tip:** After voice capture, always verify party, HSN code, and price before confirming the invoice.`,
    },
  ];

const SUGGESTED_QUESTIONS = [
  "What is GST?",
  "When is GSTR-1 due?",
  "What is ITC?",
  "CGST vs IGST difference?",
  "What is RCM?",
  "e-Invoice limit?",
  "TDS under GST?",
  "Export invoice rules?",
  "What is blocked ITC?",
];

// HSN rate lookup table (65+ common codes)
const HSN_RATE_TABLE: Record<string, { desc: string; rate: number }> = {
  "0101": { desc: "Live horses, asses, mules", rate: 0 },
  "0201": { desc: "Meat of bovine animals, fresh/chilled", rate: 0 },
  "0401": { desc: "Milk and cream, not concentrated", rate: 0 },
  "0701": { desc: "Potatoes, fresh or chilled", rate: 0 },
  "0901": { desc: "Coffee (not roasted)", rate: 0 },
  "0902": { desc: "Tea, whether or not flavoured", rate: 5 },
  "1001": { desc: "Wheat and meslin", rate: 0 },
  "1006": { desc: "Rice", rate: 0 },
  "1701": { desc: "Cane or beet sugar", rate: 5 },
  "2101": { desc: "Extracts, essences of coffee/tea", rate: 18 },
  "2201": { desc: "Waters (including mineral/aerated)", rate: 12 },
  "2202": { desc: "Carbonated drinks, cold drinks", rate: 28 },
  "2701": { desc: "Coal, briquettes, ovoids", rate: 5 },
  "2711": { desc: "Petroleum gas, LPG", rate: 5 },
  "3001": { desc: "Glands and other organs for therapeutic use", rate: 12 },
  "3004": { desc: "Medicaments (mixed/unmixed) for retail sale", rate: 12 },
  "3401": { desc: "Soap, washing preparations", rate: 18 },
  "3808": { desc: "Insecticides, fungicides, herbicides", rate: 18 },
  "3901": { desc: "Polymers of ethylene, in primary forms", rate: 18 },
  "4001": { desc: "Natural rubber", rate: 5 },
  "4901": { desc: "Printed books, brochures, leaflets", rate: 0 },
  "4902": { desc: "Newspapers, journals, periodicals", rate: 0 },
  "5201": { desc: "Cotton, not carded or combed", rate: 0 },
  "5208": { desc: "Woven fabrics of cotton", rate: 5 },
  "6101": { desc: "Men's overcoats, jackets (knitted)", rate: 5 },
  "6201": { desc: "Men's overcoats, jackets (woven)", rate: 5 },
  "6403": { desc: "Footwear with outer soles of rubber/plastics", rate: 18 },
  "7108": { desc: "Gold (including gold plated with platinum)", rate: 3 },
  "7113": { desc: "Articles of jewellery of precious metal", rate: 3 },
  "8414": { desc: "Air pumps, compressors, fans", rate: 18 },
  "8415": { desc: "Air conditioning machines", rate: 28 },
  "8471": { desc: "Automatic data processing machines (computers)", rate: 18 },
  "8473": { desc: "Parts/accessories for computers", rate: 18 },
  "8504": { desc: "Electrical transformers, static converters", rate: 18 },
  "8517": { desc: "Telephones, mobile phones, smartphones", rate: 18 },
  "8518": { desc: "Microphones, loudspeakers, headphones", rate: 18 },
  "8528": { desc: "Television sets, monitors, projectors", rate: 28 },
  "8703": { desc: "Motor cars and vehicles for persons", rate: 28 },
  "8711": { desc: "Motorcycles, mopeds", rate: 28 },
  "8802": { desc: "Aircraft (aeroplanes, helicopters)", rate: 5 },
  "9001": { desc: "Optical fibres, fibre bundles, cables", rate: 12 },
  "9403": { desc: "Other furniture (office, kitchen, bedroom)", rate: 18 },
  "9503": { desc: "Tricycles, scooters, toy vehicles for children", rate: 12 },
  "9506": { desc: "Sports equipment (tennis, badminton, etc.)", rate: 12 },
  "9619": { desc: "Sanitary towels, diapers, tampons", rate: 12 },
  // SAC Codes (Services)
  "9954": { desc: "Construction services of buildings", rate: 18 },
  "9961": { desc: "Services in wholesale trade", rate: 18 },
  "9962": { desc: "Services in retail trade", rate: 18 },
  "9971": { desc: "Financial and related services", rate: 18 },
  "9972": { desc: "Real estate services", rate: 18 },
  "9981": { desc: "R&D services", rate: 18 },
  "9983": { desc: "IT and IT-enabled services", rate: 18 },
  "9984": { desc: "Telecommunications services", rate: 18 },
  "9985": { desc: "Support services", rate: 18 },
  "9986": { desc: "Agriculture, mining, other support services", rate: 18 },
  "9987": { desc: "Maintenance, repair services", rate: 18 },
  "9988": { desc: "Manufacturing services on physical inputs", rate: 18 },
  "9989": { desc: "Other manufacturing services", rate: 18 },
  "9991": { desc: "Public administration services", rate: 0 },
  "9992": { desc: "Education services", rate: 0 },
  "9993": { desc: "Human health services", rate: 0 },
  "9996": { desc: "Recreational, cultural, sporting services", rate: 18 },
  "9997": { desc: "Other services", rate: 18 },
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function lookupHSN(query: string): string | null {
  const lower = query.toLowerCase();
  // Match "hsn 8471" or "rate for 8471" or "8471 gst"
  const codeMatch = query.match(/\b(\d{4,8})\b/);
  if (codeMatch) {
    const code = codeMatch[1].slice(0, 4); // use 4-digit
    const entry = HSN_RATE_TABLE[code];
    if (entry) {
      return `**HSN ${code}**: ${entry.desc}\n**GST Rate:** ${entry.rate}%${entry.rate === 0 ? " (Nil/Exempt)" : ""}`;
    }
  }
  // Keyword lookup
  for (const [code, data] of Object.entries(HSN_RATE_TABLE)) {
    if (lower.includes(data.desc.toLowerCase().split(",")[0])) {
      return `**HSN ${code}**: ${data.desc}\n**GST Rate:** ${data.rate}%${data.rate === 0 ? " (Nil/Exempt)" : ""}`;
    }
  }
  return null;
}

interface DataContext {
  overdueInvoices: { count: number; total: number };
  gstLiability: { cgst: number; sgst: number; igst: number; total: number };
  itcBalance: { cgst: number; sgst: number; igst: number; total: number };
}

function findAnswer(query: string, ctx?: DataContext): string {
  const lower = query.toLowerCase();

  // GSTIN validation
  const possibleGSTIN = query.trim().replace(/\s+/g, "").toUpperCase();
  if (possibleGSTIN.length === 15 && /^[0-9A-Z]+$/.test(possibleGSTIN)) {
    const isValid = GSTIN_REGEX.test(possibleGSTIN);
    const stateCode = possibleGSTIN.slice(0, 2);
    const stateMap: Record<string, string> = {
      "01": "Jammu & Kashmir",
      "02": "Himachal Pradesh",
      "03": "Punjab",
      "04": "Chandigarh",
      "05": "Uttarakhand",
      "06": "Haryana",
      "07": "Delhi",
      "08": "Rajasthan",
      "09": "Uttar Pradesh",
      "10": "Bihar",
      "11": "Sikkim",
      "12": "Arunachal Pradesh",
      "13": "Nagaland",
      "14": "Manipur",
      "15": "Mizoram",
      "16": "Tripura",
      "17": "Meghalaya",
      "18": "Assam",
      "19": "West Bengal",
      "20": "Jharkhand",
      "21": "Odisha",
      "22": "Chhattisgarh",
      "23": "Madhya Pradesh",
      "24": "Gujarat",
      "26": "Dadra and Nagar Haveli",
      "27": "Maharashtra",
      "28": "Andhra Pradesh",
      "29": "Karnataka",
      "30": "Goa",
      "31": "Lakshadweep",
      "32": "Kerala",
      "33": "Tamil Nadu",
      "34": "Puducherry",
      "35": "Andaman and Nicobar Islands",
      "36": "Telangana",
      "37": "Andhra Pradesh (New)",
      "38": "Ladakh",
      "97": "Other Territory",
      "99": "Centre",
    };
    if (isValid) {
      const stateName = stateMap[stateCode] || `State ${stateCode}`;
      const pan = possibleGSTIN.slice(2, 12);
      const entityCode = possibleGSTIN.slice(12, 13);
      const entityType =
        entityCode === "1"
          ? "Proprietorship"
          : entityCode === "2"
            ? "Partnership"
            : entityCode === "4"
              ? "Public Ltd"
              : entityCode === "5"
                ? "Foreign Company"
                : "Company/LLP";
      return `✅ **Valid GSTIN Format:** ${possibleGSTIN}\n\n• **State:** ${stateName} (${stateCode})\n• **PAN:** ${pan}\n• **Entity Code:** ${entityCode} (${entityType})\n• **Format Check:** ✓ 15-character standard complied\n\n*Note: Format validation passed. For live status (Active/Cancelled), use GST Compliance → API Integration.*`;
    }
    return `❌ **Invalid GSTIN Format:** ${possibleGSTIN}\n\n**GSTIN format:** 2-digit state code + 5-letter PAN prefix + 4-digit year + 1-letter PAN suffix + 1 entity code + Z + 1 checksum\n\nExample: 27AABCU9603R1ZX (Maharashtra)`;
  }

  // Real-data queries using context
  if (ctx) {
    if (
      lower.includes("overdue invoice") ||
      lower.includes("pending payment") ||
      lower.includes("unpaid invoice")
    ) {
      if (ctx.overdueInvoices.count === 0) {
        return "✅ **No overdue invoices!** All confirmed invoices are within their due dates.";
      }
      return `⚠️ **Overdue Invoices: ${ctx.overdueInvoices.count}**\n\n• **Total overdue amount:** ${formatINR(ctx.overdueInvoices.total)}\n• These are confirmed invoices past their due date\n\n**Action:** Go to Reports → AR Ageing to see the full breakdown with days overdue.`;
    }

    if (
      lower.includes("gst liability") ||
      lower.includes("tax payable") ||
      lower.includes("how much gst")
    ) {
      return `📊 **Current GST Liability (All Confirmed Invoices)**\n\n• **CGST:** ${formatINR(ctx.gstLiability.cgst)}\n• **SGST:** ${formatINR(ctx.gstLiability.sgst)}\n• **IGST:** ${formatINR(ctx.gstLiability.igst)}\n• **Total GST Collected:** ${formatINR(ctx.gstLiability.total)}\n\nFor net payable (after ITC deduction), check **GST Compliance → GSTR-3B**.`;
    }

    if (
      lower.includes("itc balance") ||
      lower.includes("itc available") ||
      lower.includes("input credit")
    ) {
      return `🧾 **ITC Balance (Eligible Purchases)**\n\n• **CGST ITC:** ${formatINR(ctx.itcBalance.cgst)}\n• **SGST ITC:** ${formatINR(ctx.itcBalance.sgst)}\n• **IGST ITC:** ${formatINR(ctx.itcBalance.igst)}\n• **Total Available ITC:** ${formatINR(ctx.itcBalance.total)}\n\nThis includes all confirmed purchases marked as ITC-eligible.\nFor detailed reconciliation, check **GST Compliance → ITC Reconciliation**.`;
    }
  }

  const match = GST_QA.find((qa) =>
    qa.keywords.some((kw) => lower.includes(kw)),
  );

  if (match) return match.answer;

  // HSN rate lookup
  if (
    lower.includes("hsn") ||
    lower.includes("sac") ||
    lower.includes("rate") ||
    /\b\d{4,8}\b/.test(query)
  ) {
    const hsnResult = lookupHSN(query);
    if (hsnResult) return hsnResult;
  }

  // General fallback
  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hello! I'm your GST Tax Assistant. I can answer questions about GST compliance, filing deadlines, ITC, e-invoicing, and more. What would you like to know?";
  }

  if (lower.includes("help") || lower.includes("what can you")) {
    return `I can help you with:

• **GST basics** - what is GST, rates, types
• **Filing deadlines** - GSTR-1, GSTR-3B, GSTR-9 due dates
• **ITC (Input Tax Credit)** - eligibility, blocked credits
• **e-Invoicing** - IRN generation, threshold
• **e-Way Bill** - requirements, validity
• **RCM** - reverse charge mechanism
• **HSN/SAC codes** - product/service classification
• **Composition Scheme** - eligibility, restrictions
• **GSTIN Validation** - paste any GSTIN to validate format
• **Overdue invoices** - ask "show overdue invoices"
• **GST liability** - ask "total GST liability"
• **ITC balance** - ask "ITC balance"

Try asking: "When is GSTR-1 due?" or "27AABCU9603R1ZX"`;
  }

  return `I understand you're asking about: **"${query}"**

I don't have a specific answer for that query. Here are topics I can help with:

• GST rates and tax types (CGST, SGST, IGST)
• GSTR-1, GSTR-3B, GSTR-9 filing deadlines
• Input Tax Credit (ITC) rules
• e-Invoicing and IRN generation
• e-Way Bill requirements
• Reverse Charge Mechanism (RCM)
• HSN/SAC codes
• Composition Scheme
• GSTIN Validation (paste a GSTIN to validate)
• Real-time data: overdue invoices, GST liability, ITC balance

For complex tax queries, please consult a qualified CA/Tax consultant.`;
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        // biome-ignore lint/suspicious/noArrayIndexKey: static content rendered once
        if (!line.trim()) return <br key={i} />;
        // Bold **text**
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static content rendered once
          <p key={i}>
            {parts.map((part, j) =>
              // biome-ignore lint/suspicious/noArrayIndexKey: static content rendered once
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
            )}
          </p>
        );
      })}
    </div>
  );
}

export function AIAssistant() {
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your **GST Tax Assistant**. I can help you with:\n\n• GST compliance and filing deadlines\n• GSTR-1, GSTR-3B preparation\n• ITC eligibility and rules\n• e-Invoicing, e-Way Bills\n• RCM and HSN codes\n• **GSTIN validation** — just paste a GSTIN\n• **Real-time data** — overdue invoices, GST liability, ITC balance\n\nWhat would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll side-effect on messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build data context from real data
  const dataContext: DataContext = {
    overdueInvoices: (() => {
      const today = new Date().toISOString().split("T")[0];
      const overdue = invoices.filter(
        (inv) =>
          ["sales", "service"].includes(inv.type) &&
          inv.status === "confirmed" &&
          inv.dueDate < today,
      );
      return {
        count: overdue.length,
        total: overdue.reduce((s, inv) => s + inv.grandTotal, 0),
      };
    })(),
    gstLiability: (() => {
      const confirmed = invoices.filter((inv) => inv.status === "confirmed");
      return {
        cgst: confirmed.reduce((s, inv) => s + inv.totalCgst, 0),
        sgst: confirmed.reduce((s, inv) => s + inv.totalSgst, 0),
        igst: confirmed.reduce((s, inv) => s + inv.totalIgst, 0),
        total: confirmed.reduce(
          (s, inv) => s + inv.totalCgst + inv.totalSgst + inv.totalIgst,
          0,
        ),
      };
    })(),
    itcBalance: (() => {
      const eligible = purchases.filter(
        (p) => p.status === "confirmed" && p.itcEligible,
      );
      return {
        cgst: eligible.reduce((s, p) => s + p.totalCgst, 0),
        sgst: eligible.reduce((s, p) => s + p.totalSgst, 0),
        igst: eligible.reduce((s, p) => s + p.totalIgst, 0),
        total: eligible.reduce(
          (s, p) => s + p.totalCgst + p.totalSgst + p.totalIgst,
          0,
        ),
      };
    })(),
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const answer = findAnswer(text, dataContext);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-8rem)]"
      data-ocid="ai.section"
    >
      {/* Chat Area */}
      <div className="lg:col-span-3 flex flex-col h-full">
        <Card className="bg-card border-border/70 flex flex-col flex-1 min-h-0">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              GST AI Tax Assistant
              <Badge variant="secondary" className="text-xs ml-auto">
                Beta
              </Badge>
            </CardTitle>
          </CardHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  data-ocid={`ai.message.${msg.role}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    <MessageContent content={msg.content} />
                    <p className="text-xs opacity-60 mt-1">
                      {msg.timestamp.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
              {isTyping && (
                <div
                  className="flex gap-3 justify-start"
                  data-ocid="ai.typing.loading_state"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <div className="flex gap-1">
                      <span
                        className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested Questions */}
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                  data-ocid="ai.suggestion.button"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border/50">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about GST, paste GSTIN to validate, or ask overdue invoices..."
                className="flex-1"
                data-ocid="ai.message.input"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isTyping}
                data-ocid="ai.send_button"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Side Panel */}
      <div className="space-y-3">
        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Filing Due Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              {
                label: "GSTR-1",
                date: getGSTR1DueDate(),
                color: "text-primary",
              },
              {
                label: "GSTR-3B",
                date: getGSTR3BDueDate(),
                color: "text-chart-3",
              },
              {
                label: "GSTR-2B",
                date: "14th Next Month",
                color: "text-chart-2",
              },
              {
                label: "TDS Return",
                date: "7th Next Month",
                color: "text-muted-foreground",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center text-xs"
              >
                <span className="text-muted-foreground font-medium">
                  {item.label}
                </span>
                <span className={`font-numeric ${item.color}`}>
                  {item.date}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Overdue Invoices</span>
              <span
                className={`font-bold font-numeric ${
                  dataContext.overdueInvoices.count > 0
                    ? "text-destructive"
                    : "text-chart-2"
                }`}
              >
                {dataContext.overdueInvoices.count}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">GST Collected</span>
              <span className="font-bold font-numeric text-primary">
                {formatINR(dataContext.gstLiability.total)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">ITC Available</span>
              <span className="font-bold font-numeric text-chart-2">
                {formatINR(dataContext.itcBalance.total)}
              </span>
            </div>
            <Separator className="my-1" />
            <button
              type="button"
              onClick={() => sendMessage("overdue invoices")}
              className="w-full text-xs text-primary hover:underline text-left"
            >
              → Show overdue invoices
            </button>
            <button
              type="button"
              onClick={() => sendMessage("total GST liability")}
              className="w-full text-xs text-primary hover:underline text-left"
            >
              → GST liability breakdown
            </button>
            <button
              type="button"
              onClick={() => sendMessage("ITC balance")}
              className="w-full text-xs text-primary hover:underline text-left"
            >
              → ITC balance details
            </button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-chart-3" />
              Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              💡 Paste a <strong>GSTIN</strong> to validate its format instantly
            </p>
            <p>
              💡 Ask <strong>"overdue invoices"</strong> to see unpaid amounts
            </p>
            <p>
              💡 Ask <strong>"ITC balance"</strong> for eligible credit
            </p>
            <p>
              💡 Type an <strong>HSN code</strong> to find the GST rate
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
