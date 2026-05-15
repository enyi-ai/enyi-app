// src/hmrcRules.js

export const HMRC_CATEGORIES = [
  { value: "Travel", label: "Travel", allowability: "conditional", hmrcNote: "Only travel for business purposes. Commuting from home to a regular workplace is not allowable." },
  { value: "Fuel", label: "Fuel", allowability: "conditional", hmrcNote: "Only fuel used for business journeys. Keep a mileage log. Personal fuel is not allowable." },
  { value: "Office", label: "Office & Admin", allowability: "always", hmrcNote: "Stationery, printing, postage, and small office equipment. Fully allowable." },
  { value: "Office equipment", label: "Office & Admin", allowability: "always", hmrcNote: "Equipment used exclusively for business. Fully allowable." },
  { value: "Phone", label: "Phone & Internet", allowability: "conditional", hmrcNote: "Business proportion only. If used personally too, only the business percentage is allowable." },
  { value: "Software", label: "Software & Subscriptions", allowability: "always", hmrcNote: "Business software and subscriptions are fully allowable." },
  { value: "Marketing", label: "Marketing & Advertising", allowability: "always", hmrcNote: "Advertising, website costs, and marketing materials. Fully allowable." },
  { value: "Professional fees", label: "Professional Fees", allowability: "always", hmrcNote: "Accountant, solicitor, and business consultant fees. Fully allowable." },
  { value: "Training", label: "Training & CPD", allowability: "conditional", hmrcNote: "Training to improve skills in your existing trade. New career training is not allowable." },
  { value: "Utilities", label: "Utilities", allowability: "conditional", hmrcNote: "If you work from home, only the business proportion of utilities is allowable." },
  { value: "Insurance", label: "Business Insurance", allowability: "always", hmrcNote: "Professional indemnity, public liability, and business insurance. Fully allowable." },
  { value: "Stock", label: "Stock & Materials", allowability: "always", hmrcNote: "Goods bought for resale or materials used in your business. Fully allowable." },
  { value: "Wages", label: "Staff & Wages", allowability: "always", hmrcNote: "Salaries paid to employees or subcontractors. Fully allowable." },
  { value: "Bank charges", label: "Bank Charges", allowability: "always", hmrcNote: "Business bank account fees and charges. Fully allowable." },
  { value: "Rent", label: "Rent & Premises", allowability: "conditional", hmrcNote: "Only rent for business premises. Home rent is generally not allowable." },
  { value: "Food", label: "Food & Subsistence", allowability: "conditional", hmrcNote: "Only allowable when staying away overnight for business. Day-to-day meals are not allowable." },
  { value: "Clothing", label: "Clothing & Uniform", allowability: "conditional", hmrcNote: "Only uniforms or protective clothing. Everyday clothing is not allowable." },
  { value: "Car Maintenance", label: "Vehicle Costs", allowability: "conditional", hmrcNote: "Business vehicle maintenance is allowable. Personal vehicle costs are not." },
  { value: "Groceries", label: "Groceries", allowability: "never", hmrcNote: "Personal grocery shopping is not an allowable business expense." },
  { value: "Mortgage", label: "Mortgage", allowability: "never", hmrcNote: "Mortgage payments are not allowable. Speak to an accountant about working from home claims." },
  { value: "Personal", label: "Personal", allowability: "never", hmrcNote: "Personal expenses are not allowable for tax purposes." },
  { value: "Entertainment", label: "Client Entertainment", allowability: "never", hmrcNote: "Client entertainment is specifically not allowable under HMRC rules." },
  { value: "Payment", label: "Payment", allowability: "conditional", hmrcNote: "Review this transaction — 'Payment' is not a recognised HMRC category. Please recategorise." },
  { value: "Shopping", label: "Shopping", allowability: "never", hmrcNote: "General shopping is not an allowable business expense." },
  { value: "Misc", label: "Miscellaneous", allowability: "conditional", hmrcNote: "Review and recategorise. HMRC may query uncategorised costs." },
];

export const ALLOWABILITY_CONFIG = {
  always: {
    badge: null,
    color: null,
  },
  conditional: {
    badge: "⚠️ Review",
    color: "#b45309",
    background: "#fffbeb",
    border: "#f59e0b",
    message: (category) => {
      const cat = HMRC_CATEGORIES.find(c => c.value === category);
      return cat?.hmrcNote || "This expense may only be partially allowable. Check HMRC rules.";
    }
  },
  never: {
    badge: "🚨 Not allowable",
    color: "#b91c1c",
    background: "#fff5f5",
    border: "#ef4444",
    message: (category) => {
      const cat = HMRC_CATEGORIES.find(c => c.value === category);
      return cat?.hmrcNote || "This expense is not tax-deductible under HMRC rules.";
    }
  }
};

export const getCategoryAllowability = (categoryValue) => {
  const cat = HMRC_CATEGORIES.find(c => c.value === categoryValue);
  return cat?.allowability || "conditional";
};

export const getCategoryNote = (categoryValue) => {
  const cat = HMRC_CATEGORIES.find(c => c.value === categoryValue);
  return cat?.hmrcNote || "";
};

export const shouldFlag = (categoryValue) => {
  const allowability = getCategoryAllowability(categoryValue);
  return allowability === "conditional" || allowability === "never";
};
