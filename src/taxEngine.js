// ── taxEngine.js ──────────────────────────────────────────────
// Region-aware tax calculation for Enyi
// Supports: england_wales | scotland | northern_ireland
// Class 4 NI is the same across all regions (HMRC, not devolved)
// 2025/26 tax year figures
// ──────────────────────────────────────────────────────────────

export const TAX_REGIONS = [
  { value: "england_wales", label: "England & Wales" },
  { value: "scotland",      label: "Scotland" },
  { value: "northern_ireland", label: "Northern Ireland" },
];

export const PERSONAL_ALLOWANCE = 12570;

// ── Personal allowance tapers above £100k ──
export const calculatePersonalAllowance = (income) => {
  if (income <= 100000) return PERSONAL_ALLOWANCE;
  const reduction = (income - 100000) / 2;
  return Math.max(PERSONAL_ALLOWANCE - reduction, 0);
};

// ── England, Wales & Northern Ireland ──
// (NI follows Westminster rates, not Stormont)
const calculateEnglandWalesNITax = (taxableIncome) => {
  let remaining = taxableIncome;
  let tax = 0;

  // Basic rate: 20% up to £37,700
  const basicSlice = Math.min(remaining, 37700);
  tax += basicSlice * 0.20;
  remaining -= basicSlice;

  // Higher rate: 40% up to £125,140 (taxable)
  if (remaining > 0) {
    const higherSlice = Math.min(remaining, 125140 - 12570 - 37700);
    tax += higherSlice * 0.40;
    remaining -= higherSlice;
  }

  // Additional rate: 45%
  if (remaining > 0) {
    tax += remaining * 0.45;
  }

  return tax;
};

// ── Scotland ──
// 6-band system, different rates to rest of UK
const calculateScottishTax = (taxableIncome) => {
  let remaining = taxableIncome;
  let tax = 0;

  // Starter rate: 19% — £12,571 to £15,397 (£2,827 band)
  const starterSlice = Math.min(remaining, 2827);
  tax += starterSlice * 0.19;
  remaining -= starterSlice;

  // Basic rate: 20% — £15,398 to £25,378 (£9,981 band)
  if (remaining > 0) {
    const basicSlice = Math.min(remaining, 9981);
    tax += basicSlice * 0.20;
    remaining -= basicSlice;
  }

  // Intermediate rate: 21% — £25,379 to £43,662 (£18,284 band)
  if (remaining > 0) {
    const intermediateSlice = Math.min(remaining, 18284);
    tax += intermediateSlice * 0.21;
    remaining -= intermediateSlice;
  }

  // Higher rate: 42% — £43,663 to £75,000 (£31,338 band)
  if (remaining > 0) {
    const higherSlice = Math.min(remaining, 31338);
    tax += higherSlice * 0.42;
    remaining -= higherSlice;
  }

  // Advanced rate: 45% — £75,001 to £125,140 (£50,140 band)
  if (remaining > 0) {
    const advancedSlice = Math.min(remaining, 50140);
    tax += advancedSlice * 0.45;
    remaining -= advancedSlice;
  }

  // Top rate: 48% — above £125,140
  if (remaining > 0) {
    tax += remaining * 0.48;
  }

  return tax;
};

// ── Class 4 NI — same everywhere ──
export const calculateClass4NI = (profits) => {
  if (profits <= 12570) return 0;
  let ni = 0;
  const mainBandUpper = 50270;
  const mainSlice = Math.min(profits, mainBandUpper) - 12570;
  if (mainSlice > 0) ni += mainSlice * 0.06;
  if (profits > mainBandUpper) ni += (profits - mainBandUpper) * 0.02;
  return ni;
};

// ── Main export — calculate income tax by region ──
export const calculateIncomeTax = (taxableIncome, region = "england_wales") => {
  if (taxableIncome <= 0) return 0;
  if (region === "scotland") return calculateScottishTax(taxableIncome);
  // england_wales and northern_ireland use the same Westminster rates
  return calculateEnglandWalesNITax(taxableIncome);
};

// ── Full tax summary — convenience function for App.js ──
export const calculateTaxSummary = (taxableProfit, otherAnnualIncome = 0, region = "england_wales") => {
  const totalTaxableSources = Math.max(taxableProfit + otherAnnualIncome, 0);
  const personalAllowance = calculatePersonalAllowance(totalTaxableSources);
  const taxableIncome = Math.max(totalTaxableSources - personalAllowance, 0);
  const estimatedIncomeTax = calculateIncomeTax(taxableIncome, region);
  const estimatedClass4NI = calculateClass4NI(Math.max(taxableProfit, 0));
  const estimatedTotalTax = estimatedIncomeTax + estimatedClass4NI;
  const monthlyTaxPot = estimatedTotalTax / 12;

  return {
    totalTaxableSources,
    personalAllowance,
    taxableIncome,
    estimatedIncomeTax,
    estimatedClass4NI,
    estimatedTotalTax,
    monthlyTaxPot,
  };
};

// ── Region display helpers ──
export const getRegionLabel = (region) => {
  const found = TAX_REGIONS.find(r => r.value === region);
  return found ? found.label : "England & Wales";
};

export const getRegionAuthority = (region) => {
  if (region === "scotland") return "Revenue Scotland & HMRC";
  return "HMRC";
};

// ── Scottish band names for use in narrative/AI ──
export const getScottishBandName = (taxableIncome) => {
  if (taxableIncome <= 2827)  return "Starter rate (19%)";
  if (taxableIncome <= 12808) return "Basic rate (20%)";
  if (taxableIncome <= 31092) return "Intermediate rate (21%)";
  if (taxableIncome <= 62430) return "Higher rate (42%)";
  if (taxableIncome <= 112570) return "Advanced rate (45%)";
  return "Top rate (48%)";
};

// ── Region-aware narrative snippet for financial insight ──
export const getTaxRegionNarrative = (region, estimatedTotalTax, monthlyTaxPot, taxableIncome) => {
  const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

  if (region === "scotland") {
    const band = getScottishBandName(taxableIncome);
    return `💰 Scottish tax: You're in the ${band} band. Set aside ${fmt(monthlyTaxPot)} this month for your tax pot. Estimated total liability: ${fmt(estimatedTotalTax)} (calculated under Scottish Income Tax rates via Revenue Scotland & HMRC).`;
  }

  const authority = region === "northern_ireland" ? "HMRC (Northern Ireland follows Westminster rates)" : "HMRC";
  return `💰 Action: Set aside ${fmt(monthlyTaxPot)} this month for your tax pot. Your estimated total tax liability is ${fmt(estimatedTotalTax)} (calculated under ${authority} rates).`;
};
