import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getGSTR1DueDate, getGSTR3BDueDate } from "@/utils/formatting";
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

**Example for 18% GST:**
• Intrastate: 9% CGST + 9% SGST
• Interstate: 18% IGST

The "place of supply" determines which applies.`,
    },
    {
      keywords: ["rcm", "reverse charge mechanism", "reverse charge"],
      question: "What is RCM (Reverse Charge Mechanism)?",
      answer: `**Reverse Charge Mechanism (RCM)** is where the **recipient** (buyer) pays GST instead of the supplier.

**Applicable in:**
• Purchases from unregistered dealers (above ₹5,000/day)
• Specific services (GTA, legal services, import of services, etc.)
• Advocate fees to business
• Security services

**Key points:**
• Buyer must self-invoice
• Pay GST in cash (cannot use ITC)
• Can claim ITC on RCM paid (if eligible)
• Report in GSTR-3B Table 3.1(d)`,
    },
    {
      keywords: ["hsn code", "hsn", "sac code", "sac", "harmonized system"],
      question: "What is HSN/SAC code?",
      answer: `**HSN** (Harmonized System of Nomenclature) is used for **goods**.
**SAC** (Services Accounting Code) is used for **services**.

**Mandatory for invoices:**
• Annual turnover ≤ ₹5 Cr: 4-digit HSN
• Annual turnover > ₹5 Cr: 6-digit HSN
• Exporters: 8-digit HSN

**Common examples:**
• 0901: Coffee
• 8471: Computers
• 9983: IT services (SAC)
• 9954: Construction services (SAC)`,
    },
    {
      keywords: [
        "e-invoice",
        "einvoice",
        "irn",
        "e invoice limit",
        "electronic invoice",
      ],
      question: "What is e-Invoicing and what's the threshold?",
      answer: `**e-Invoicing** is mandatory generation of IRN (Invoice Reference Number) from the GSTN portal.

**Current threshold:** Turnover **> ₹5 Crore** in any preceding financial year.

**Process:**
1. Generate invoice in your system
2. Upload to IRP (Invoice Registration Portal)
3. IRP validates and returns **IRN + QR code**
4. Print QR code on invoice

**Benefits:**
• Auto-population of GSTR-1
• Reduced errors
• Faster ITC claims

**Exempted:** Insurance, banking, SEZ supplies`,
    },
    {
      keywords: ["composition scheme", "composition dealer"],
      question: "What is the Composition Scheme?",
      answer: `**Composition Scheme** is a simplified GST registration for small businesses.

**Eligibility:** Annual turnover ≤ ₹1.5 Crore (₹75 Lakh for special category states)

**GST rates (on turnover):**
• Manufacturers: 1%
• Restaurants: 5%
• Other businesses: 1%

**Restrictions:**
• Cannot issue tax invoice
• Must issue Bill of Supply
• Cannot collect GST from customers
• Cannot claim ITC
• Cannot supply interstate
• File quarterly return (CMP-08)`,
    },
    {
      keywords: ["eway bill", "e-way bill", "ewb", "what is eway"],
      question: "What is an e-Way Bill?",
      answer: `**e-Way Bill** is an electronic document required for movement of goods valued > **₹50,000**.

**Generated by:** Supplier, recipient, or transporter

**Validity:**
• Up to 100 km: 1 day
• Per additional 100 km: 1 additional day

**When required:**
• Interstate movement
• Intrastate movement (if state mandates)
• Job work movement

**Not required for:**
• Goods of value < ₹50,000
• Non-motorized transport
• Empty cargo vehicles
• Specific exempt goods`,
    },
    {
      keywords: ["gstr-9", "annual return", "gstr9"],
      question: "What is GSTR-9 (Annual Return)?",
      answer: `**GSTR-9** is the annual return summarizing all monthly/quarterly returns.
 
**Due date:** 31st December of the following financial year
 
**Types:**
• GSTR-9: For regular taxpayers
• GSTR-9A: For composition dealers  
• GSTR-9C: Reconciliation statement (audit) for turnover > ₹5 Cr
 
**Contains:**
• Outward supplies summary
• Inward supplies & ITC summary
• Tax paid details
• Any amendments/corrections`,
    },
    {
      keywords: ["tds", "tds on gst", "tax deducted at source gst"],
      question: "Is TDS applicable on GST?",
      answer: `**TDS (Tax Deducted at Source) under GST** applies when government entities, PSUs, and certain notified persons make payments to suppliers.

**Rate:** 2% (1% CGST + 1% SGST) or 2% IGST

**Applicable when:**
• Contract value exceeds ₹2.5 Lakh
• Deductor: Government departments, local authorities, PSUs, certain societies

**Deductee benefits:**
• TDS credit auto-reflected in electronic cash ledger (GSTR-7A)
• Deductee can use credit to pay output tax

**Returns:**
• Deductor files GSTR-7 by 10th of next month
• Deductee verifies in GSTR-2B`,
    },
    {
      keywords: [
        "export invoice",
        "zero rated",
        "export gst",
        "lut",
        "letter of undertaking",
      ],
      question: "How is GST handled on export invoices?",
      answer: `**Exports are Zero-Rated Supplies** under GST.

**Two options for exporters:**

**Option 1: Export without payment of IGST (LUT)**
• Apply for Letter of Undertaking (LUT) on GST portal
• Export without paying IGST
• Claim refund of ITC accumulated

**Option 2: Export with payment of IGST**
• Pay IGST and claim refund later

**Invoice requirements:**
• Mark as "SUPPLY MEANT FOR EXPORT UNDER LUT"
• Include shipping bill number
• Currency: can be in foreign currency

**LUT validity:** One financial year
• File in GST portal under Services > User Services > Furnish LUT`,
    },
    {
      keywords: ["sez", "special economic zone", "sez supply"],
      question: "What is GST treatment for SEZ supplies?",
      answer: `**SEZ (Special Economic Zone) supplies are also Zero-Rated** like exports.

**Two modes:**
1. Supply with IGST payment (claim refund later)
2. Supply under LUT without IGST (input ITC refund)

**Key points:**
• Supplier in DTA (Domestic Tariff Area) supplies to SEZ developer/unit
• SEZ purchases are zero-rated -- no IGST on inward
• Separate columns in GSTR-1 for SEZ supplies

**Documents required:**
• Endorsed copy of the invoice
• Endorsement certificate from specified officer of SEZ`,
    },
    {
      keywords: [
        "blocked itc",
        "section 17(5)",
        "itc not allowed",
        "ineligible itc",
      ],
      question: "What ITC is blocked under Section 17(5)?",
      answer: `**Blocked ITC under Section 17(5)** -- These credits CANNOT be claimed:

• **Motor vehicles** (< 13 persons seating) unless used for transport/supply of goods/training
• **Food and beverages**, outdoor catering
• **Beauty treatment**, health services, cosmetic surgery
• **Membership of club**, health and fitness centre
• **Travel benefits** to employees (leave travel, home travel)
• **Works contract services** for immovable property (except plant & machinery)
• **Goods/services for personal consumption**
• **Goods lost, stolen, destroyed** or written off

**Remember:** The purpose matters -- if the above items are used to make taxable outward supply of same category, ITC may be allowed.`,
    },
    {
      keywords: ["advance receipt", "gst on advance", "advance payment gst"],
      question: "How is GST applied on advance receipts?",
      answer: `**GST on Advance Receipts:**

From **1 Oct 2022**, for **goods**: No GST on advance received -- pay GST only when invoice is issued.

For **services**: GST is payable on advance receipt itself.

**Process for services:**
1. Receive advance → issue Receipt Voucher
2. Pay GST in same month (GSTR-3B)
3. When invoice raised → adjust advance GST
4. If service cancelled → issue Refund Voucher

**Receipt Voucher must contain:**
• Name, address, GSTIN of supplier and recipient
• Description of services
• Amount of advance
• Tax amount (CGST/SGST or IGST)
• Place of supply`,
    },
    {
      keywords: [
        "aggregate turnover",
        "gst turnover",
        "registration limit",
        "threshold limit gst",
      ],
      question: "What is GST registration threshold?",
      answer: `**GST Registration Threshold (Aggregate Annual Turnover):**

| Category | Normal States | Special Category States |
|----------|--------------|------------------------|
| Goods | ₹40 Lakhs | ₹20 Lakhs |
| Services | ₹20 Lakhs | ₹10 Lakhs |

**Special category states:** Manipur, Mizoram, Nagaland, Tripura, Meghalaya, Sikkim, Arunachal Pradesh, Uttarakhand, Himachal Pradesh, J&K

**Aggregate turnover includes:**
• All taxable supplies
• Exempt supplies
• Exports
• Inter-state supplies

**Excludes:** Inward supplies on which RCM is paid

**Mandatory registration** (regardless of turnover):
• Inter-state supplies
• e-Commerce operators
• Casual taxable persons`,
    },
    {
      keywords: ["nil return", "nil gstr", "zero turnover return"],
      question: "How to file nil GST returns?",
      answer: `**Nil GST Returns** -- when no transactions in a period:

**GSTR-1 Nil:**
• File by 11th of next month (monthly) or 13th end of quarter
• Can file via SMS: Send **NIL R1 GSTIN TAX PERIOD** to 14409
• Example: NIL R1 07XXXXX1234Z1 032023

**GSTR-3B Nil:**
• File by 20th of next month
• SMS: **NIL 3B GSTIN TAX PERIOD** to 14409

**Consequences of not filing:**
• Late fee: ₹20/day for nil returns (max ₹500)
• Cannot file next period's return
• GSTIN may get suspended

**Note:** Even if no sales but ITC to claim, file full return, not nil.`,
    },
    {
      keywords: ["place of supply", "pos rules", "which state gst"],
      question: "How is Place of Supply determined?",
      answer: `**Place of Supply (PoS)** determines whether CGST+SGST or IGST applies.

**For Goods:**
• Movement of goods → destination state
• No movement → location of goods
• Installed/assembled → installation location

**For Services (key rules):**
• Location-based services (restaurants, hotels) → where service is performed
• Immovable property → where property is located
• Transportation of goods → destination
• Telecom/DTH → location of subscriber
• Banking/financial → location of recipient (if registered)

**B2B:** PoS = Location of recipient (registered)
**B2C (inter-state, > ₹2.5L):** PoS = registered recipient's state

**Practical tip:** Same state = CGST+SGST; Different state = IGST`,
    },
    {
      keywords: ["gst penalty", "late fee gst", "interest gst"],
      question: "What are GST penalties and late fees?",
      answer: `**GST Late Fees & Penalties:**

| Return | Late Fee (with tax) | Late Fee (Nil) |
|--------|--------------------|--------------------|
| GSTR-1 | ₹50/day (max ₹5,000) | ₹20/day (max ₹500) |
| GSTR-3B | ₹50/day (max ₹5,000) | ₹20/day (max ₹500) |
| GSTR-9 | 0.25% of turnover | - |

**Interest:**
• Late payment of GST: 18% p.a.
• Excess ITC claim (demand): 24% p.a.

**Penalties:**
• Tax evasion: 100% of tax evaded (min ₹10,000)
• Incorrect invoice: ₹10,000 or 100% of tax (higher)
• Not issuing invoice: ₹10,000 or 100% of tax

**Prosecution threshold:** > ₹5 Crore evasion`,
    },
    {
      keywords: ["gstr-2b", "2b reconciliation", "auto drafted itc"],
      question: "What is GSTR-2B and how to reconcile?",
      answer: `**GSTR-2B** is an auto-drafted ITC statement generated on 14th of each month.

**Sources:**
• Supplier's GSTR-1 / IFF filings
• GSTR-5 (non-resident), GSTR-6 (ISD)

**Key difference from GSTR-2A:**
• GSTR-2B is static (snapshot on 14th)
• GSTR-2A is dynamic (updates in real-time)
• Claim ITC based on GSTR-2B

**Reconciliation process:**
1. Download GSTR-2B from portal
2. Compare with your purchase register
3. Identify mismatches (invoices in your books but not in 2B)
4. Follow up with vendors for corrections
5. Claim only matched ITC in GSTR-3B

**Rule 36(4):** ITC restricted to 105% of GSTR-2B matched invoices`,
    },
    {
      keywords: ["gst audit", "audit under gst", "section 65 66"],
      question: "What is GST Audit?",
      answer: `**Types of GST Audits:**

**1. Departmental Audit (Sec 65):**
• Conducted by Commissioner or authorized officer
• 3 months notice given (extendable to 6 months)
• Taxpayer provides records, books, documents
• Audit report within 30 days of completion

**2. Special Audit (Sec 66):**
• Ordered if complex value/credit issues found
• CA or Cost Accountant appointed by Commissioner
• 90 days to complete (extendable)

**3. Self-Certification (GSTR-9C):**
• For turnover > ₹5 Crore
• CA/CMA certifies reconciliation statement

**What auditors check:**
• ITC claims vs GSTR-2B
• Output tax declared vs books
• HSN classification accuracy
• E-invoice compliance`,
    },
    {
      keywords: [
        "gst import",
        "import goods gst",
        "igst on import",
        "customs duty gst",
      ],
      question: "How is GST applied on imports?",
      answer: `**GST on Imports:**

Imports are treated as **Inter-state supply** → IGST applicable.

**Components on import:**
1. Basic Customs Duty (BCD) -- not creditable
2. **IGST** -- creditable as ITC
3. Social Welfare Surcharge (SWS) -- not creditable
4. Cess (if applicable)

**IGST calculation:**
IGST = (Assessable Value + BCD + SWS) × IGST Rate

**ITC on imports:**
• IGST paid at customs is available as ITC
• Reflect in GSTR-3B Table 4(A)(1) "Import of Goods"
• Auto-populated from ICEGATE data in GSTR-2B

**Service imports:**
• Pay GST under RCM
• Report in GSTR-3B Table 3.1(d)`,
    },
    {
      keywords: [
        "invoice format",
        "tax invoice requirements",
        "mandatory invoice fields",
      ],
      question: "What are mandatory fields on a GST Tax Invoice?",
      answer: `**Mandatory fields on GST Tax Invoice:**

**Supplier details:**
• Name, address, GSTIN
• Invoice number (unique, sequential)
• Invoice date

**Recipient details:**
• Name, address
• GSTIN (for B2B)
• Place of supply (state code + state name)

**Item details:**
• Description of goods/services
• HSN/SAC code
• Quantity + Unit
• Unit price
• Discount (if any)
• Taxable value

**Tax details:**
• GST rate + amount (CGST/SGST or IGST separately)
• Cess (if applicable)

**Other:**
• Whether tax is payable on reverse charge
• Signature / Digital signature
• For > ₹5 Crore: IRN + QR code`,
    },
    {
      keywords: ["e-commerce gst", "tcs gst", "amazon flipkart gst"],
      question: "What is TCS for e-Commerce operators?",
      answer: `**TCS (Tax Collected at Source)** under Section 52 of CGST Act:

**Who collects:** E-commerce operators (Amazon, Flipkart, Meesho, Zomato, etc.)

**Rate:** 1% (0.5% CGST + 0.5% SGST) or 1% IGST on net value of taxable supplies

**Process:**
• E-commerce operator deducts 1% TCS from supplier payout
• Deposits to government by 10th of next month
• Files GSTR-8 return monthly

**Seller (supplier) benefits:**
• TCS credit auto-reflected in electronic cash ledger
• Use credit to pay output tax
• Visible in GSTR-2A under Table 5

**Note:** Supplier must be registered on the e-commerce platform with their GSTIN`,
    },
    {
      keywords: ["refund gst", "gst refund claim", "how to claim refund"],
      question: "How to claim GST refund?",
      answer: `**GST Refund situations:**

1. **Export of goods/services** (zero-rated)
2. **Inverted duty structure** (ITC > output tax)
3. **Excess tax paid by mistake**
4. **Tax paid on provisional basis**
5. **Refund to international tourists**

**Process (RFD-01):**
• Apply within **2 years** of relevant date
• File application on GST portal: Refunds > Application for Refund
• Upload supporting documents
• Pre-audit by officer

**Timelines:**
• Provisional refund: 60% within 7 working days
• Final refund: Within 60 days
• If delay > 60 days: Interest @6% p.a.

**Documents for export refund:**
• GSTR-3B, GSTR-1
• Shipping bills / Bank realization certificate`,
    },
    {
      keywords: ["anomaly", "check errors", "detect errors", "invoice errors"],
      question: "How does AI Anomaly Detection work?",
      answer: `**AI Anomaly Detection** on the Dashboard automatically scans your invoices and purchases for 5 types of issues:

1. **Duplicate invoice numbers** — same invoice number used more than once
2. **High-value invoices without GSTIN** — invoices > ₹50,000 with no party GSTIN (B2B compliance risk)
3. **Zero GST on high-value invoices** — sales/service invoices > ₹10,000 with all items at 0% GST (potential misclassification)
4. **RCM purchases without notes** — RCM entries with no justification text
5. **Credit/Debit notes without linked invoices** — notes not linked to original invoice (violates GST rules)

**To view anomalies:** Go to **Dashboard → AI Anomaly Detection** panel.

Each anomaly is tagged as **Warning** or **Error** based on compliance severity.`,
    },
    {
      keywords: [
        "cash flow forecast",
        "predict cash flow",
        "future cash flow",
        "projection",
      ],
      question: "How does the Predictive Cash Flow forecast work?",
      answer: `**Predictive Cash Flow** uses a simple 3-month rolling average model:

**Methodology:**
1. Calculates average monthly sales from the last 3 months of confirmed invoices
2. Calculates average monthly purchases from the last 3 months
3. Projects these averages forward for the next 3 months
4. Shows Net Cash Flow = Projected Sales – Projected Purchases

**Where to see it:**
• **Dashboard → Predictive Cash Flow (3-Month Forecast)** panel
• **Reports → Cash Flow → Forecast tab** for detailed 5-column view with cumulative balance

**Limitations:** This is a simple trend model. It does not account for seasonality, one-time events, or future commitments. Always use in conjunction with your CA's projections.`,
    },
    {
      keywords: ["workflow automation", "auto reminder", "automated alerts"],
      question: "What automated workflows are available?",
      answer: `**8 Automated Workflows** are available in GST Compliance → Workflow Automation:

1. **GSTR-1 Filing Reminder** — 5 days before 11th each month
2. **GSTR-3B Filing Reminder** — 5 days before 20th each month
3. **Overdue Invoice Alerts** — daily scan for unpaid invoices past due date
4. **Low Stock Notifications** — when closing stock ≤ 5 units for any item
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

function findAnswer(query: string): string {
  const lower = query.toLowerCase();
  const match = GST_QA.find((qa) =>
    qa.keywords.some((kw) => lower.includes(kw)),
  );

  if (match) return match.answer;

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

Try asking: "When is GSTR-1 due?" or "What is ITC?"`;
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your **GST Tax Assistant**. I can help you with:\n\n• GST compliance and filing deadlines\n• GSTR-1, GSTR-3B preparation\n• ITC eligibility and rules\n• e-Invoicing, e-Way Bills\n• RCM and HSN codes\n\nWhat would you like to know?",
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
      const answer = findAnswer(text);
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
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
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
                placeholder="Ask about GST rates, filing dates, ITC..."
                className="flex-1"
                data-ocid="ai.input"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isTyping}
                data-ocid="ai.send.primary_button"
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
              <Lightbulb className="w-3.5 h-3.5 text-chart-3" />
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>• File GSTR-1 before GSTR-3B to ensure ITC matching</p>
            <Separator />
            <p>• Reconcile GSTR-2B with purchase register monthly</p>
            <Separator />
            <p>• e-Invoice mandatory above ₹5 Cr turnover</p>
            <Separator />
            <p>• Pay GST by 20th to avoid interest @18%</p>
            <Separator />
            <p>• RCM payments can't use ITC — pay in cash ledger</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
