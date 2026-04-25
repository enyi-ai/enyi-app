import { auth, db } from "./firebase";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import { useEffect, useRef, useState } from "react";
import "./App.css";
import logoIcon from "./assets/enyi-icon.png";
import AIChatPanel from "./components/AIChatPanel";
import { FiMenu } from "react-icons/fi";

function getCurrentFinancialYear() {
  const today = new Date();
  const year = today.getFullYear();
  const taxYearStart = new Date(year, 3, 6); // 6 April

  if (today >= taxYearStart) {
    return `${year}/${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}/${String(year).slice(-2)}`;
  }
}

function App() {
  const [input, setInput] = useState("");
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(getCurrentFinancialYear());
  const [expandedMonths, setExpandedMonths] = useState({});
  const [otherIncomeType, setOtherIncomeType] = useState("salary");
  const [otherIncomeAmount, setOtherIncomeAmount] = useState("");
  const [otherIncomeSources, setOtherIncomeSources] = useState([]);
  const [transactionType, setTransactionType] = useState("expense");
  const [statusMessage, setStatusMessage] = useState("");
  const [transactionSuccessMessage, setTransactionSuccessMessage] = useState("");
  const [receiptSuccessMessage, setReceiptSuccessMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [receiptStatus, setReceiptStatus] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [showReceiptReview, setShowReceiptReview] = useState(false);
  const [region] = useState("England / Wales / Northern Ireland");
  const [menuOpen, setMenuOpen] = useState(false);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);



  const [transactions, setTransactions] = useState([]);
  useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    setCurrentUser(user);
  });

  return () => unsubscribe();
}, []);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    text: "",
    category: "",
    amount: "",
    date: "",
    type: "expense"
  });
  const scrollToSection = (id) => {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  setMenuOpen(false);
};

const normalizeCategory = (category, text = "") => {
  const value = `${category} ${text}`.toLowerCase();

  if (
    value.includes("fuel") ||
    value.includes("petrol") ||
    value.includes("diesel")
  ) {
    return "Fuel";
  }

if (
  value.includes("uber") ||
  value.includes("taxi") ||
  value.includes("train") ||
  value.includes("bus") ||
  value.includes("flight") ||
  value.includes("plane") ||
  value.includes("transport")
) {
  return "Travel";
}

  return category || "Misc";
};


useEffect(() => {
  const loadTransactions = async () => {
    if (!currentUser) {
      setTransactions([]);
      return;
    }

    try {
      const q = query(
        collection(db, "users", currentUser.uid, "transactions"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setTransactions(items);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  loadTransactions();
}, [currentUser]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP"
    }).format(Number(value) || 0);
  };

  const extractAmountFromText = (text) => {
    const match = text.match(/(\d+(\.\d+)?)/);
    return match ? match[1] : "0";
  };

  const showTemporaryReceiptSuccess = (message) => {
    setReceiptSuccessMessage(message);
    setTimeout(() => setReceiptSuccessMessage(""), 3000);
  };

  const resetReceiptInputs = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setShowReceiptReview(false);
    setReceiptStatus("");

    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getCategoryColor = (category) => {
    const key = (category || "").toLowerCase();
    if (key === "food") return "chip-food";
    if (key === "travel") return "chip-travel";
    if (key === "utilities") return "chip-utilities";
    if (key === "rent") return "chip-rent";
    if (key === "income") return "chip-income";
    return "chip-misc";
  };
  const getFinancialYearRange = (taxYearLabel) => {
  const [startYearStr, endYearShort] = taxYearLabel.split("/");
  const startYear = parseInt(startYearStr, 10);
  const endYear = 2000 + parseInt(endYearShort, 10);

  return {
    start: new Date(`${startYear}-04-06T00:00:00`),
    end: new Date(`${endYear}-04-05T23:59:59`)
  };
};

  const addTransaction = async () => {
    setStatusMessage("");
    setTransactionSuccessMessage("");

    if (!input.trim()) {
      setStatusMessage("Please enter a transaction.");
      return;
    }

    try {
      setStatusMessage("Processing...");

      if (transactionType === "income") {
        const cleanAmount = extractAmountFromText(input);

        const newTransaction = {
          id: Date.now(),
          text: input,
          category: "Income",
          amount: cleanAmount,
          date: new Date().toISOString(),
          type: "income"
        };

        if (!currentUser) return;

const firestoreTransaction = {
  ...newTransaction,
  createdAt: serverTimestamp(),
};

const docRef = await addDoc(
  collection(db, "users", currentUser.uid, "transactions"),
  firestoreTransaction
);

setTransactions((prev) => [
  { id: docRef.id, ...newTransaction },
  ...prev,
]);

        setInput("");
        setStatusMessage("");
        setTransactionSuccessMessage(
          `Income added (${formatCurrency(cleanAmount)})`
        );

        setTimeout(() => {
          setTransactionSuccessMessage("");
        }, 2500);

        return;
      }

const response = await 
fetch(`${process.env.REACT_APP_API_BASE_URL}/api/categorise-expense`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ text: input })
});

const data = await response.json();

if (!response.ok) {
  throw new Error(data.error || "Could not categorise expense.");
}

const newTransaction = {
  id: Date.now(),
  text: input,
  category: normalizeCategory(data.category, input),
  amount: Number(data.amount) || 0,
  date: new Date().toISOString(),
  type: "expense"
};

if (!currentUser) return;

const firestoreTransaction = {
  ...newTransaction,
  createdAt: serverTimestamp(),
};

const docRef = await addDoc(
  collection(db, "users", currentUser.uid, "transactions"),
  firestoreTransaction
);

setTransactions((prev) => [
  { id: docRef.id, ...newTransaction },
  ...prev,
]);

setInput("");
setStatusMessage("");
const finalCategory = normalizeCategory(data.category, input);

setTransactionSuccessMessage(
  `Expense added (${finalCategory}: ${formatCurrency(Number(data.amount) || 0)})`
);

setTimeout(() => {
  setTransactionSuccessMessage("");
}, 2500);    
} catch (error) {
  console.error(error);
  setTransactionSuccessMessage("");
  setStatusMessage(error.message || "Something went wrong.");
}
  };

  const handleReceiptSelection = (file) => {
    if (!file) return;
    setReceiptFile(file);
    setReceiptStatus("");
    setReceiptSuccessMessage("");
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile) {
      setReceiptStatus("Please choose or take a receipt image first.");
      return;
    }

    try {
      setReceiptStatus("Processing receipt...");

      const formData = new FormData();
      formData.append("receipt", receiptFile);

      const response = await 
fetch(`${process.env.REACT_APP_API_BASE_URL}/api/receipt/parse`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setReceiptStatus(`Error: ${data.error || "Could not parse receipt."}`);
        return;
      }

      setReceiptPreview({
        merchant: data.merchant || "Unknown merchant",
        amount: data.amount || "0",
        date: data.date || new Date().toLocaleDateString(),
        category: data.category || "Misc",
        notes: data.notes || ""
      });

      setShowReceiptReview(true);
      setReceiptStatus("Review receipt details below.");
    } catch (error) {
      console.error(error);
      setReceiptStatus("Something went wrong while uploading the receipt.");
    }
  };


const confirmReceiptSave = async () => {
  if (!receiptPreview) return;


const safeDate = convertUkDateToIso(receiptPreview.date);

  const newTransaction = {
    id: Date.now(),
    text: receiptPreview.merchant,
    category: receiptPreview.category,
    amount: receiptPreview.amount,
    date: safeDate,
    type: "expense"
  };

if (!currentUser) return;

const firestoreTransaction = {
  ...newTransaction,
  createdAt: serverTimestamp(),
};

const docRef = await addDoc(
  collection(db, "users", currentUser.uid, "transactions"),
  firestoreTransaction
);

setTransactions((prev) => [
  { id: docRef.id, ...newTransaction },
  ...prev,
]);

showTemporaryReceiptSuccess(
  `Receipt added: ${receiptPreview.merchant} (${formatCurrency(
    receiptPreview.amount
  )}) • Saved to ${getFinancialYearLabelFromDate(safeDate)}`
);
  resetReceiptInputs();
};

  const cancelReceiptReview = () => {
    resetReceiptInputs();
  };

const deleteTransaction = async (id) => {
  const confirmed = window.confirm("Delete this transaction?");
  if (!confirmed) return;

  if (!currentUser) return;

  try {
    await deleteDoc(
      doc(db, "users", currentUser.uid, "transactions", id)
    );

    setTransactions((prev) =>
      prev.filter((transaction) => transaction.id !== id)
    );
  } catch (error) {
    console.error("Failed to delete transaction:", error);
  }
};

const clearAllTransactions = async () => {
  const confirmed = window.confirm(
    "Are you sure you want to delete all transactions?"
  );
  if (!confirmed) return;

  if (!currentUser) return;

  try {
    const snapshot = await getDocs(
      collection(db, "users", currentUser.uid, "transactions")
    );

    const deletePromises = snapshot.docs.map((docSnap) =>
      deleteDoc(doc(db, "users", currentUser.uid, "transactions", docSnap.id))
    );

    await Promise.all(deletePromises); // ✅ fixed

    setTransactions([]);
    setInput("");
    setStatusMessage("");
    setTransactionSuccessMessage("");
    setReceiptSuccessMessage("");
    resetReceiptInputs();
  } catch (error) {
    console.error("Failed to clear all transactions:", error);
  }
};
  const startEditing = (transaction) => {
    setEditingId(transaction.id);
    setEditForm({
      text: transaction.text,
      category: transaction.category,
      amount: transaction.amount,
      date: transaction.date,
      type: transaction.type || "expense"
    });
  };

const saveEdit = async (id) => {
  if (!currentUser) return;

  const updatedTransaction = {
    text: editForm.text,
    category: editForm.category,
    amount: editForm.amount,
    date: editForm.date,
    type: editForm.type,
  };

  try {
    await updateDoc(
      doc(db, "users", currentUser.uid, "transactions", id),
      updatedTransaction
    );

    setTransactions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updatedTransaction } : item
      )
    );
  } catch (error) {
    console.error("Failed to update transaction:", error);
  }

  setEditingId(null);
  setEditForm({
    text: "",
    category: "",
    amount: "",
    date: "",
    type: "expense",
  });
};
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      text: "",
      category: "",
      amount: "",
      date: "",
      type: "expense"
    });
  };

const { start: fyStart, end: fyEnd } = getFinancialYearRange(selectedFinancialYear);
const financialYearTransactions = transactions.filter((transaction) => {
  const transactionDate = new Date(transaction.date);
  return transactionDate >= fyStart && transactionDate <= fyEnd;
});

const totalIncome = financialYearTransactions
  .filter((transaction) => transaction.type === "income")
  .reduce((sum, transaction) => sum + (parseFloat(transaction.amount) || 0), 0);

const totalExpenses = financialYearTransactions
  .filter((transaction) => transaction.type !== "income")
  .reduce((sum, transaction) => sum + (parseFloat(transaction.amount) || 0), 0);

const profit = totalIncome - totalExpenses;
const businessProfit = profit;

const otherIncomeTotal = otherIncomeSources.reduce(
  (sum, item) => sum + (parseFloat(item.amount) || 0),
  0
);

const combinedIncome = businessProfit + otherIncomeTotal;


const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

const monthlyTransactions = transactions.filter((transaction) => {
  const transactionDate = new Date(transaction.date);


  return (
    transactionDate.getMonth() === currentMonth &&
    transactionDate.getFullYear() === currentYear
  );
});

const monthlyIncome = monthlyTransactions
  .filter((transaction) => transaction.type === "income")
  .reduce((sum, transaction) => sum + (parseFloat(transaction.amount) || 0), 0);

const monthlyExpenses = monthlyTransactions
  .filter((transaction) => transaction.type !== "income")
  .reduce((sum, transaction) => sum + (parseFloat(transaction.amount) || 0), 0);

const monthlyProfit = monthlyIncome - monthlyExpenses;

const filteredHistoryTransactions = financialYearTransactions
  .slice()
  .sort((a, b) => new Date(b.date) - new Date(a.date));

  const categoryTotals = {};
financialYearTransactions
    .filter((transaction) => transaction.type !== "income")
    .forEach((transaction) => {
      const amount = parseFloat(transaction.amount) || 0;
      if (!categoryTotals[transaction.category]) {
        categoryTotals[transaction.category] = 0;
      }
      categoryTotals[transaction.category] += amount;
    });

  const maxCategoryAmount = Math.max(...Object.values(categoryTotals), 0);

const otherAnnualIncome = otherIncomeSources.reduce(
  (sum, item) => sum + (parseFloat(item.amount) || 0),
  0
);
  const estimatedProfit = Math.max(profit, 0);
  const totalTaxableSources = Math.max(estimatedProfit + otherAnnualIncome, 0);

  const calculatePersonalAllowance = (income) => {
    const baseAllowance = 12570;
    if (income <= 100000) return baseAllowance;
    const reduction = (income - 100000) / 2;
    return Math.max(baseAllowance - reduction, 0);
  };

  const personalAllowance = calculatePersonalAllowance(totalTaxableSources);
  const taxableIncome = Math.max(totalTaxableSources - personalAllowance, 0);

  const calculateIncomeTax = (taxable) => {
    let remaining = taxable;
    let tax = 0;

    const basicBand = 37700;
    const higherBandTaxableLimit = 125140 - 12570;

    const basicSlice = Math.min(remaining, basicBand);
    tax += basicSlice * 0.2;
    remaining -= basicSlice;

    if (remaining > 0) {
      const higherSlice = Math.min(
        remaining,
        higherBandTaxableLimit - basicBand
      );
      tax += higherSlice * 0.4;
      remaining -= higherSlice;
    }

    if (remaining > 0) {
      tax += remaining * 0.45;
    }

    return tax;
  };

  const calculateClass4NI = (profits) => {
    if (profits <= 12570) return 0;

    let ni = 0;
    const mainBandUpper = 50270;

    const mainSlice = Math.min(profits, mainBandUpper) - 12570;
    if (mainSlice > 0) {
      ni += mainSlice * 0.06;
    }

    if (profits > mainBandUpper) {
      ni += (profits - mainBandUpper) * 0.02;
    }

    return ni;
  };

  const estimatedIncomeTax = calculateIncomeTax(taxableIncome);
  const estimatedClass4NI = calculateClass4NI(estimatedProfit);
  const estimatedTotalTax = estimatedIncomeTax + estimatedClass4NI;
  const takeHome = combinedIncome - estimatedTotalTax;
  const monthlyTaxPot = estimatedTotalTax / 12;
const groupedHistoryTransactions = filteredHistoryTransactions.reduce(
  (groups, transaction) => {
    const date = new Date(transaction.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(transaction);
    return groups;
  },
  {}
);

const sortedHistoryMonths = Object.keys(groupedHistoryTransactions).sort(
  (a, b) => {
    const [yearA, monthA] = a.split("-").map(Number);
    const [yearB, monthB] = b.split("-").map(Number);

    return new Date(yearB, monthB) - new Date(yearA, monthA);
  }
);

const getHistoryMonthSummary = (monthTransactions) => {
  const income = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (sum, transaction) => sum + (parseFloat(transaction.amount) || 0),
      0
    );

  const expenses = monthTransactions
    .filter((transaction) => transaction.type !== "income")
    .reduce(
      (sum, transaction) => sum + (parseFloat(transaction.amount) || 0),
      0
    );

  return {
    income,
    expenses,
    profit: income - expenses
  };
};
  const downloadCSV = () => {
    if (transactions.length === 0) {
      alert("No transactions to download.");
      return;
    }

    const headers = ["Text", "Type", "Category", "Amount", "Date"];
    const rows = transactions.map((transaction) => [
      transaction.text,
      transaction.type,
      transaction.category,
      transaction.amount,
      transaction.date
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "enyi-transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const toggleMonth = (monthKey) => {
  setExpandedMonths((prev) => ({
    ...prev,
    [monthKey]: !prev[monthKey]
  }));
};
const addOtherIncomeSource = () => {
  const parsedAmount = parseFloat(otherIncomeAmount);

  if (!parsedAmount || parsedAmount <= 0) return;

  setOtherIncomeSources((prev) => {
    const existing = prev.find((item) => item.type === otherIncomeType);

    if (existing) {
      return prev.map((item) =>
        item.type === otherIncomeType
          ? { ...item, amount: (parseFloat(item.amount) || 0) + parsedAmount }
          : item
      );
    }

    return [
      ...prev,
      {
        id: Date.now(),
        type: otherIncomeType,
        amount: parsedAmount
      }
    ];
  });

  setOtherIncomeAmount("");
};

const deleteOtherIncomeSource = (id) => {
  setOtherIncomeSources((prev) => prev.filter((item) => item.id !== id));
};
const formatIncomeTypeLabel = (type) => {
  if (type === "salary") return "Salary";
  if (type === "rental") return "Rental income";
  if (type === "dividends") return "Dividends";
  if (type === "interest") return "Interest";
  return "Other";
};
const getFinancialYearLabelFromDate = (dateValue) => {
  const d = new Date(dateValue);

  const year = d.getFullYear();
  const taxYearStart = new Date(year, 3, 6); // 6 April

  if (d >= taxYearStart) {
    const nextShort = String((year + 1) % 100).padStart(2, "0");
    return `${year}/${nextShort}`;
  }

  const prevYear = year - 1;
  const shortYear = String(year % 100).padStart(2, "0");
  return `${prevYear}/${shortYear}`;
};
const convertUkDateToIso = (dateString) => {
  if (!dateString) return new Date().toISOString();

  // already ISO-like
  if (dateString.includes("T")) return new Date(dateString).toISOString();

  const parts = dateString.split("/");

  if (parts.length === 3) {
    const [day, month, year] = parts;
    const safeDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
    return safeDate.toISOString();
  }

  const fallback = new Date(dateString);
  return isNaN(fallback.getTime())
    ? new Date().toISOString()
    : fallback.toISOString();
};

const handleSignOut = async () => {
  try {
    await auth.signOut();
    window.location.href = "/";
  } catch (error) {
    console.error(error);
  }
};

  return (
    <div className="app-shell">
      <div className="app-container">
        <header className="brand-header">

  <div className="brand-lockup">
    <div className="brand-icon-tile">
      <img src={logoIcon} alt="Enyi icon" className="brand-icon" />
    </div>

    <div className="brand-text">
      <h1 className="brand-name">Enyi</h1>
      <p className="brand-tagline">Bookkeeping and tax. Sorted by AI.</p>
    </div>
  </div>

           <div className="nav-menu-wrapper">
    <button
      className="nav-menu-button"
      onClick={() => setMenuOpen(!menuOpen)}
      aria-label="Open navigation menu"
    >
      <FiMenu size={24} />
    </button>

    {menuOpen && (
      <div className="nav-dropdown">
        <button onClick={() => scrollToSection("add-transaction")}>Add Transaction</button>
        <button onClick={() => scrollToSection("receipts")}>Receipts</button>
        <button onClick={() => scrollToSection("financial-overview")}>Financial Overview</button>
        <button onClick={() => scrollToSection("spending-categories")}>Spending Categories</button>
        <button onClick={() => scrollToSection("tax-estimate")}>Tax Estimate</button>
        <button onClick={() => scrollToSection("enyi-ai")}>Enyi AI</button>
        <button onClick={() => scrollToSection("transaction-history")}>Transaction History</button>

        <div className="nav-divider" />

        <button className="nav-signout" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    )}
    </div>


</header>

        <section className="hero-card">
          <div className="hero-grid">
            <div className="hero-left">
              <h2 className="hero-title">
                Your money,
                <br />
                organised.
              </h2>

              <p className="hero-subtitle">
                AI-powered bookkeeping and tax tracking that keeps your business
                clear, compliant and in control.
              </p>
            </div>

            <div className="hero-right">
              <div className="hero-balance-card">
                <span className="hero-balance-label">Net position</span>
                <h3 className="hero-balance-value">{formatCurrency(profit)}</h3>
                <p className="hero-balance-meta">
                  Income {formatCurrency(totalIncome)} • Expenses{" "}
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="overview-strip">
          <div className="overview-pill">
            <span className="overview-kicker">Income</span>
            <strong>{formatCurrency(totalIncome)}</strong>
          </div>

          <div className="overview-pill">
            <span className="overview-kicker">Expenses</span>
            <strong>{formatCurrency(totalExpenses)}</strong>
          </div>

         <div className="overview-pill">
  <span className="overview-kicker">Transactions</span>
  <strong>{financialYearTransactions.length}</strong>
</div>

          <div className="overview-pill">
            <span className="overview-kicker">This month</span>
            <strong>{formatCurrency(monthlyProfit)}</strong>
          </div>
        </section>

        <section className="top-grid">
  <div id="add-transaction" className="fin-card">
    <div className="section-head">
      <h2>Add Transaction</h2>
      <p>Quickly log income or expenses</p>
    </div>

            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="fin-input"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>

            <input
              type="text"
              placeholder={
                transactionType === "income"
                  ? "Enter income..."
                  : "Enter expense..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="fin-input"
            />

            <button onClick={addTransaction} className="primary-button">
              Add Transaction
            </button>

            {statusMessage && <p className="status-text">{statusMessage}</p>}
            {transactionSuccessMessage && (
              <p className="success-text">{transactionSuccessMessage}</p>
            )}
          </div>

          <div id="receipts" className="fin-card">
  <div className="section-head">
    <h2>Receipts</h2>
    <p>Capture or upload receipts instantly</p>
  </div>
            <div className="receipt-actions">
              <label className="primary-button action-button">
                Take Receipt Photo
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleReceiptSelection(e.target.files[0])}
                  style={{ display: "none" }}
                />
              </label>

              <label className="secondary-button action-button">
                Upload Receipt File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleReceiptSelection(e.target.files[0])}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {receiptFile && (
              <div className="receipt-selected-box">
                <p className="receipt-selected-text">
                  Selected: {receiptFile.name}
                </p>

                {receiptFile.type.startsWith("image/") && (
                  <img
                    src={URL.createObjectURL(receiptFile)}
                    alt="Receipt preview"
                    className="receipt-preview-image"
                  />
                )}

                <button onClick={handleReceiptUpload} className="primary-button">
                  Upload Receipt
                </button>
              </div>
            )}

            {receiptStatus && <p className="status-text">{receiptStatus}</p>}
            {receiptSuccessMessage && (
              <p className="success-text">{receiptSuccessMessage}</p>
            )}

            {showReceiptReview && receiptPreview && (
              <div className="review-box">
                <h3>Review receipt</h3>

                <input
                  className="fin-input"
                  value={receiptPreview.merchant}
                  onChange={(e) =>
                    setReceiptPreview({
                      ...receiptPreview,
                      merchant: e.target.value
                    })
                  }
                  placeholder="Merchant"
                />

                <input
                  className="fin-input"
                  value={receiptPreview.amount}
                  onChange={(e) =>
                    setReceiptPreview({
                      ...receiptPreview,
                      amount: e.target.value
                    })
                  }
                  placeholder="Amount"
                />

                <input
                  className="fin-input"
                  value={receiptPreview.date}
                  onChange={(e) =>
                    setReceiptPreview({
                      ...receiptPreview,
                      date: e.target.value
                    })
                  }
                  placeholder="Date"
                />

                <select
                  className="fin-input"
                  value={receiptPreview.category}
                  onChange={(e) =>
                    setReceiptPreview({
                      ...receiptPreview,
                      category: e.target.value
                    })
                  }
                >
                  <option value="Food">Food</option>
                  <option value="Travel">Travel</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Rent">Rent</option>
                  <option value="Misc">Misc</option>
                </select>

                <div className="button-group">
                  <button onClick={confirmReceiptSave} className="primary-button">
                    Confirm Save
                  </button>

                  <button onClick={cancelReceiptReview} className="secondary-button">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="two-column-grid">


<div id="financial-overview" className="fin-card">
 <div className="summary-top">
  <div>
    <h2>Financial Overview</h2>

    <p className="section-subtitle">
      A live snapshot of your business finances
    </p>
    <div className="financial-year-row">
      <label className="financial-year-label">Financial year</label>
      <select
        value={selectedFinancialYear}
        onChange={(e) => setSelectedFinancialYear(e.target.value)}
        className="financial-year-select"
      >
        <option value="2023/24">2023/24</option>
        <option value="2024/25">2024/25</option>
        <option value="2025/26">2025/26</option>
        <option value="2026/27">2026/27</option>
      </select>
    </div>
  </div>

  <div className="brand-chip">Live</div>
</div>

            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-label">Income</span>
                <span className="stat-value">{formatCurrency(totalIncome)}</span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Expenses</span>
                <span className="stat-value">{formatCurrency(totalExpenses)}</span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Profit</span>
                <span className="stat-value">{formatCurrency(profit)}</span>
              </div>

              <div className="stat-card">
              <span className="stat-label">Transactions</span>
              <span className="stat-value">{financialYearTransactions.length}</span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Monthly income</span>
                <span className="stat-value">{formatCurrency(monthlyIncome)}</span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Monthly expenses</span>
                <span className="stat-value">{formatCurrency(monthlyExpenses)}</span>
              </div>
            </div>

            <div className="button-group top-space">
              <button onClick={downloadCSV} className="primary-button">
                Download CSV
              </button>

              <button onClick={clearAllTransactions} className="secondary-button">
                Clear All Data
              </button>
            </div>
          </div>

<div id="spending-categories" className="fin-card">
  <div className="section-head">
    <h2>Spending by Category</h2>
    <p>See where your money is going in {selectedFinancialYear}</p>
  </div>

  {Object.entries(categoryTotals).length === 0 ? (
    <p className="empty-text">No expense categories yet for {selectedFinancialYear}.</p>
  ) : (
    <div className="category-chart">
      {Object.entries(categoryTotals).map(([cat, amt]) => (
        <div key={cat} className="chart-row">
          <div className="chart-row-top">
            <span className={`category-chip ${getCategoryColor(cat)}`}>
              {cat}
            </span>
            <strong>{formatCurrency(amt)}</strong>
          </div>

          <div className="chart-track">
            <div
              className={`chart-fill ${getCategoryColor(cat)}`}
              style={{
                width:
                  maxCategoryAmount > 0
                    ? `${(amt / maxCategoryAmount) * 100}%`
                    : "0%"
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )}
</div>
        </section>

 
<section id="tax-estimate" className="fin-card">
  <div className="summary-top">
    <div>
      <h2>Tax Estimate</h2>
      <p className="section-subtitle">
        UK sole trader estimate • {region} • Viewing {selectedFinancialYear}
      </p>
    </div>
    <div className="brand-chip">Estimate</div>
  </div>

<div className="tax-input-block top-space">
  <div className="tax-label-row">
    <label className="tax-input-label">
      Other taxable income outside this business
    </label>

    <span className="info-icon">
      ⓘ
      <span className="tooltip">
        Include income not recorded in this business, such as salary, rental
        income, dividends or interest.
      </span>
    </span>
  </div>

  <div className="tax-income-row">
    <select
      value={otherIncomeType}
      onChange={(e) => setOtherIncomeType(e.target.value)}
      className="tax-income-select"
    >
      <option value="salary">Salary</option>
      <option value="rental">Rental income</option>
      <option value="dividends">Dividends</option>
      <option value="interest">Interest</option>
      <option value="other">Other</option>
    </select>

    <input
      type="number"
      min="0"
      step="0.01"
      value={otherIncomeAmount}
      onChange={(e) => setOtherIncomeAmount(e.target.value)}
      className="fin-input tax-income-amount"
      placeholder="Enter amount"
    />

    <button
      type="button"
      onClick={addOtherIncomeSource}
      className="secondary-button tax-add-income-button"
    >
      Add
    </button>
  </div>

  {otherIncomeSources.length > 0 && (
    <div className="other-income-list">
      {otherIncomeSources.map((item) => (
        <div key={item.id} className="other-income-item">
          <div className="other-income-left">
            <span className="other-income-type">
              {formatIncomeTypeLabel(item.type)}
            </span>
            <span className="other-income-value">
              {formatCurrency(item.amount)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => deleteOtherIncomeSource(item.id)}
            className="other-income-remove"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )}
</div>

  <div className="stat-grid top-space">
    <div className="stat-card">
      <span className="stat-label">Business profit (before tax)</span>
      <span className="stat-value">{formatCurrency(estimatedProfit)}</span>
    </div>

    <div className="stat-card">
      <span className="stat-label">Personal allowance</span>
      <span className="stat-value">{formatCurrency(personalAllowance)}</span>
    </div>

    <div className="stat-card">
      <span className="stat-label">Taxable income</span>
      <span className="stat-value">{formatCurrency(taxableIncome)}</span>
    </div>

    <div className="stat-card">
      <span className="stat-label">Estimated Income Tax</span>
      <span className="stat-value">{formatCurrency(estimatedIncomeTax)}</span>
    </div>

    <div className="stat-card">
      <span className="stat-label">Estimated Class 4 NI</span>
      <span className="stat-value">{formatCurrency(estimatedClass4NI)}</span>
    </div>

    <div className="stat-card highlight-card">
      <span className="stat-label">Estimated total tax</span>
      <span className="stat-value">{formatCurrency(estimatedTotalTax)}</span>
    </div>

    <div className="stat-card">
      <span className="stat-label">Take-home (after tax)</span>
      <span className="stat-value">{formatCurrency(takeHome)}</span>
    </div>

    <div className="stat-card highlight-card">
      <span className="stat-label">Monthly tax pot</span>
      <span className="stat-value">{formatCurrency(monthlyTaxPot)}</span>
    </div>
  </div>

  <p className="tax-note bottom-note">
    Estimate only. Final tax may differ based on other income, reliefs,
    allowances and HMRC rules.
  </p>
</section>

<div id="enyi-ai" className="fin-card"></div>
<AIChatPanel
  selectedFinancialYear={selectedFinancialYear}
  transactions={transactions}
/>

<section id="transaction-history" className="fin-card">
  <div className="section-head">
    <h2 className="section-title">Transaction History</h2>
    <p>Review and manage your records for {selectedFinancialYear}</p>
  </div>

  {sortedHistoryMonths.length === 0 ? (
    <p className="empty-text">
      No transactions found for {selectedFinancialYear}.
    </p>
  ) : (
    <div className="history-grouped-list">
      {sortedHistoryMonths.map((monthKey) => {
        const monthTransactions = groupedHistoryTransactions[monthKey];
        const monthSummary = getHistoryMonthSummary(monthTransactions);
        const [year, month] = monthKey.split("-").map(Number);

        const monthLabel = new Date(year, month).toLocaleString("en-GB", {
          month: "long",
          year: "numeric"
        });

        const isExpanded = !!expandedMonths[monthKey];

        return (
          <div key={monthKey} className="month-group">
            <button
              type="button"
              className="month-group-header month-toggle"
              onClick={() => toggleMonth(monthKey)}
            >
              <div>
                <h3 className="month-group-title">{monthLabel}</h3>
                <p className="month-group-subtitle">
                  {monthTransactions.length} transaction
                  {monthTransactions.length !== 1 ? "s" : ""}
                </p>
              </div>

            <div className="month-group-summary-wrap">
  <div className="month-group-summary">
    <span className="month-summary-item">
      Income {formatCurrency(monthSummary.income)}
    </span>

    <span className="month-summary-item">
      Expenses {formatCurrency(monthSummary.expenses)}
    </span>

    <strong
      className={`month-summary-net ${
        monthSummary.profit < 0 ? "negative" : "positive"
      }`}
    >
      Net {formatCurrency(monthSummary.profit)}
    </strong>
  </div>
                <span className={`month-chevron ${isExpanded ? "open" : ""}`}>
                  ▾
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="history-list">
                {monthTransactions.map((transaction) => (
                  <div key={transaction.id} className="history-item">
                    {editingId === transaction.id ? (
                      <div>
                        <input
                          value={editForm.text}
                          onChange={(e) =>
                            setEditForm({ ...editForm, text: e.target.value })
                          }
                          className="fin-input"
                        />

                        <select
                          value={editForm.type}
                          onChange={(e) =>
                            setEditForm({ ...editForm, type: e.target.value })
                          }
                          className="fin-input"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>

                        <select
                          value={editForm.category}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              category: e.target.value
                            })
                          }
                          className="fin-input"
                        >
                          <option value="">Select category</option>
                          <option value="Income">Income</option>
                          <option value="Food">Food</option>
                          <option value="Travel">Travel</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Rent">Rent</option>
                          <option value="Misc">Misc</option>
                        </select>

                        <input
                          value={editForm.amount}
                          onChange={(e) =>
                            setEditForm({ ...editForm, amount: e.target.value })
                          }
                          className="fin-input"
                        />

                        <input
                          value={editForm.date}
                          onChange={(e) =>
                            setEditForm({ ...editForm, date: e.target.value })
                          }
                          className="fin-input"
                        />

                        <div className="button-group">
                          <button
                            onClick={() => saveEdit(transaction.id)}
                            className="primary-button"
                          >
                            Save
                          </button>

                          <button
                            onClick={cancelEdit}
                            className="secondary-button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="history-item-inner">
                        <div className="history-left">
                          <div className="history-title">{transaction.text}</div>
                          <div className="history-meta">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>

                          <div className="history-chip-row">
                            <span
                              className={`category-chip ${getCategoryColor(
                                transaction.category
                              )}`}
                            >
                              {transaction.category}
                            </span>

                            <span
                              className={`type-chip ${
                                transaction.type === "income"
                                  ? "type-income"
                                  : "type-expense"
                              }`}
                            >
                              {transaction.type}
                            </span>
                          </div>
                        </div>

                        <div className="history-right">
                          <div className="history-amount">
                            {formatCurrency(transaction.amount)}
                          </div>

                          <div className="button-group history-actions">
                            <button
                              onClick={() => startEditing(transaction)}
                              className="secondary-button small-button"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteTransaction(transaction.id)}
                              className="secondary-button small-button"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  )}
</section>
      </div>
    </div>
  );
}

export default App;