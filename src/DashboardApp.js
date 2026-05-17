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
  getDoc,               
} from "firebase/firestore";

import { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";
import logoIcon from "./assets/enyi-icon.png";
import AIChatPanel from "./components/AIChatPanel";
import { FiMenu } from "react-icons/fi";
import HMRCFlagModal from "./components/HMRCFlagModal";
import { shouldFlag, getCategoryAllowability } from "./hmrcRules";
import "./components/HMRCFlagModal.css";
import GoalSetupModal from "./components/GoalSetupModal";
import SettingsModal from "./components/SettingsModal";
import "./components/GoalSetupModal.css";
import "./components/SettingsModal.css";

function getCurrentFinancialYear() {
  const today = new Date();
  const year = today.getFullYear();
  const taxYearStart = new Date(year, 3, 6);
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
  // eslint-disable-next-line no-unused-vars
const [otherIncomeType, setOtherIncomeType] = useState("salary");

const [otherIncomeAmount, setOtherIncomeAmount] = useState("");
const [otherIncomeSources, setOtherIncomeSources] = useState([]);

  const [transactionType, setTransactionType] = useState("expense");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [transactionSuccessMessage, setTransactionSuccessMessage] = useState("");
  const [receiptSuccessMessage, setReceiptSuccessMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [csvRange, setCsvRange] = useState("all");
  const [csvStartDate, setCsvStartDate] = useState("");
  const [csvEndDate, setCsvEndDate] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [hmrcFlagTransaction, setHmrcFlagTransaction] = useState(null);
  const [receiptStatus, setReceiptStatus] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [showReceiptReview, setShowReceiptReview] = useState(false);

  const [expandedDrawers, setExpandedDrawers] = useState({
  business: true,
  tax: false,
  monthly: false
});
const [snapshotMonth, setSnapshotMonth] = useState(new Date());

  const [menuOpen, setMenuOpen] = useState(false);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [transactions, setTransactions] = useState([]);
  const [, setInsights] = useState([]);
  const [showInsight, setShowInsight] = useState(false);
  const [goalProfit, setGoalProfit] = useState(null);
const [showGoalSetup, setShowGoalSetup] = useState(false);
const [showSettings, setShowSettings] = useState(false);
const [goalLoaded, setGoalLoaded] = useState(false);


  const [expandedCategories, setExpandedCategories] = useState({
  always: true,
  conditional: false,
  never: false
});

const toggleCategorySection = (section) => {
  setExpandedCategories(prev => ({ ...prev, [section]: !prev[section] }));
};


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/health`).catch(() => {});
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
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  const normalizeCategory = (category, text = "") => {
    const value = `${category} ${text}`.toLowerCase();
    if (value.includes("fuel") || value.includes("petrol") || value.includes("diesel")) return "Fuel";
    if (value.includes("uber") || value.includes("taxi") || value.includes("train") ||
        value.includes("bus") || value.includes("flight") || value.includes("plane") ||
        value.includes("transport")) return "Travel";
    if (value.includes("mortgage")) return "Mortgage";
    if (value.includes("rent")) return "Rent";
    if (value.includes("groceries") || value.includes("tesco") || value.includes("aldi") ||
        value.includes("sainsbury") || value.includes("asda") || value.includes("lidl")) return "Groceries";
    if (value.includes("restaurant") || value.includes("food") || value.includes("cafe")) return "Food";
    if (value.includes("electric") || value.includes("water") || value.includes("gas") ||
        value.includes("utilities")) return "Utilities";
    if (value.includes("internet") || value.includes("broadband")) return "Phone";
    if (value.includes("phone") || value.includes("mobile")) return "Phone";
    if (value.includes("insurance")) return "Insurance";
    if (value.includes("repair") || value.includes("service") || value.includes("mot")) return "Travel";
    if (value.includes("accountant") || value.includes("legal") || value.includes("solicitor")) return "Professional fees";
    if (value.includes("software") || value.includes("subscription") || value.includes("saas")) return "Software";
    if (value.includes("marketing") || value.includes("advertising")) return "Marketing";
    if (value.includes("training") || value.includes("course") || value.includes("cpd")) return "Training";
    if (value.includes("amazon") || value.includes("shopping")) return "Office";
    if (value.includes("clothing") || value.includes("uniform")) return "Clothing";
    if (value.includes("entertainment") || value.includes("client meal")) return "Entertainment";
    return category || "Misc";
  };

  useEffect(() => {
    const loadTransactions = async () => {
      if (!currentUser) { setTransactions([]); return; }
      try {
        const q = query(
          collection(db, "users", currentUser.uid, "transactions"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        setTransactions(items);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      }
    };
    loadTransactions();
  }, [currentUser]);

  // ── LOAD GOAL FROM FIRESTORE ──
useEffect(() => {
  const loadGoal = async () => {
    if (!currentUser || goalLoaded) return;
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const fyKey = `goalProfit_${selectedFinancialYear.replace("/", "_")}`;

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data[fyKey]) {
          setGoalProfit(data[fyKey]);
        } else {
          setTimeout(() => setShowGoalSetup(true), 1200);
        }
      }
    } catch (error) {
      console.error("Failed to load goal:", error);
    }
    setGoalLoaded(true);
  };

  loadGoal();
}, [currentUser, goalLoaded, selectedFinancialYear]);

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

  useEffect(() => {
    if (!currentUser) return;
    const INACTIVITY_LIMIT = 3 * 60 * 1000;
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await auth.signOut();
        setCurrentUser(null);
      }, INACTIVITY_LIMIT);
    };
    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getCategoryColor = (category) => {
    const key = (category || "").toLowerCase();
    if (key === "food") return "chip-food";
    if (key === "travel") return "chip-travel";
    if (key === "fuel") return "chip-travel";
    if (key === "utilities") return "chip-utilities";
    if (key === "rent") return "chip-rent";
    if (key === "income") return "chip-income";
    if (key === "personal") return "chip-personal";
    if (key === "groceries") return "chip-never";
    if (key === "mortgage") return "chip-never";
    if (key === "entertainment") return "chip-never";
    if (key === "clothing") return "chip-conditional";
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
  // ── GOAL HANDLERS ──
const handleSaveGoal = async (amount) => {
  if (!currentUser) return;
  try {
    const fyKey = `goalProfit_${selectedFinancialYear.replace("/", "_")}`;
    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, { [fyKey]: amount });
    setGoalProfit(amount);
    setShowGoalSetup(false);
    setShowSettings(false);
  } catch (error) {
    console.error("Failed to save goal:", error);
  }
};

const handleSkipGoal = () => {
  setShowGoalSetup(false);
};

const toggleDrawer = (drawer) => {
  setExpandedDrawers(prev => ({ ...prev, [drawer]: !prev[drawer] }));
};


  // ── HMRC HANDLERS ──
  const handleHmrcOverride = async (transactionId, reason) => {
    if (!currentUser) return;
    try {
      await updateDoc(
        doc(db, "users", currentUser.uid, "transactions", transactionId),
        { hmrcStatus: "overridden", hmrcOverrideReason: reason }
      );
      setTransactions(prev =>
        prev.map(t =>
          t.id === transactionId
            ? { ...t, hmrcStatus: "overridden", hmrcOverrideReason: reason }
            : t
        )
      );
    } catch (error) {
      console.error("Failed to save override:", error);
    }
    setHmrcFlagTransaction(null);
  };

  const handleHmrcRecategorise = async (transactionId, newCategory) => {
    if (!currentUser) return;
    try {
      await updateDoc(
        doc(db, "users", currentUser.uid, "transactions", transactionId),
        { category: newCategory, hmrcStatus: "recategorised" }
      );
      setTransactions(prev =>
        prev.map(t =>
          t.id === transactionId
            ? { ...t, category: newCategory, hmrcStatus: "recategorised" }
            : t
        )
      );
    } catch (error) {
      console.error("Failed to recategorise:", error);
    }
    setHmrcFlagTransaction(null);
  };

  const handleHmrcMarkPersonal = async (transactionId) => {
    if (!currentUser) return;
    try {
      await updateDoc(
        doc(db, "users", currentUser.uid, "transactions", transactionId),
        { category: "Personal", hmrcStatus: "personal" }
      );
      setTransactions(prev =>
        prev.map(t =>
          t.id === transactionId
            ? { ...t, category: "Personal", hmrcStatus: "personal" }
            : t
        )
      );
    } catch (error) {
      console.error("Failed to mark as personal:", error);
    }
    setHmrcFlagTransaction(null);
  };

  const handleHmrcDismiss = () => setHmrcFlagTransaction(null);

  const addTransaction = async () => {
    setStatusMessage("");
    setTransactionSuccessMessage("");
    if (!input.trim()) { setStatusMessage("Please enter a transaction."); return; }

    try {
      setStatusMessage("Enyi is categorising your transaction. sit tight");

      if (transactionType === "income") {
        const cleanAmount = extractAmountFromText(input);
        const newTransaction = {
          id: Date.now(),
          text: input,
          category: "Income",
          amount: cleanAmount,
          date: new Date(transactionDate).toISOString(),
          type: "income"
        };
        if (!currentUser) return;
        const firestoreTransaction = { ...newTransaction, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "users", currentUser.uid, "transactions"),
          firestoreTransaction
        );
        setTransactions((prev) => [{ id: docRef.id, ...newTransaction }, ...prev]);
        setInput("");
        setStatusMessage("");
        setTransactionDate(new Date().toISOString().split("T")[0]);
        setTransactionSuccessMessage(`Income added (${formatCurrency(cleanAmount)})`);
        setTimeout(() => setTransactionSuccessMessage(""), 2500);
        return;
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/categorise-expense`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input })
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not categorise expense.");

      const finalCategory = normalizeCategory(data.category, input);
      const newTransaction = {
        id: Date.now(),
        text: input,
        category: finalCategory,
        amount: Number(data.amount) || 0,
        date: new Date(transactionDate).toISOString(),
        type: "expense"
      };
      if (!currentUser) return;
      const firestoreTransaction = { ...newTransaction, createdAt: serverTimestamp() };
      const docRef = await addDoc(
        collection(db, "users", currentUser.uid, "transactions"),
        firestoreTransaction
      );
      setTransactions((prev) => [{ id: docRef.id, ...newTransaction }, ...prev]);
      setInput("");
      setStatusMessage("");
      setTransactionDate(new Date().toISOString().split("T")[0]);
      setTransactionSuccessMessage(
        `Expense added (${finalCategory}: ${formatCurrency(Number(data.amount) || 0)})`
      );
      setTimeout(() => setTransactionSuccessMessage(""), 2500);

      if (shouldFlag(finalCategory)) {
        setTimeout(() => {
          setHmrcFlagTransaction({
            id: docRef.id,
            text: input,
            amount: Number(data.amount) || 0,
            category: finalCategory
          });
        }, 800);
      }
    } catch (error) {
      console.error(error);
      setTransactionSuccessMessage("");
      setStatusMessage(error.message || "Something went wrong.");
    }
  };

  const resizeImage = (file, maxWidth = 1400, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) { resolve(file); return; }
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      img.onload = () => {
        const scale = maxWidth / img.width;
        const width = img.width > maxWidth ? maxWidth : img.width;
        const height = img.width > maxWidth ? img.height * scale : img.height;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" }));
        }, "image/jpeg", quality);
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleReceiptSelection = (file) => {
    if (!file) return;
    setReceiptFile(file);
    setReceiptStatus("");
    setReceiptSuccessMessage("");
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile) { setReceiptStatus("Please choose or take a receipt image first."); return; }
    try {
      setReceiptStatus("Enyi is reading your receipt...just a moment");
      const compressedFile = await resizeImage(receiptFile);
      const formData = new FormData();
      formData.append("receipt", compressedFile);
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/receipt/parse`,
        { method: "POST", body: formData }
      );
      const data = await response.json();
      if (!response.ok) { setReceiptStatus(`Error: ${data.error || "Could not parse receipt."}`); return; }
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
    const firestoreTransaction = { ...newTransaction, createdAt: serverTimestamp() };
    const docRef = await addDoc(
      collection(db, "users", currentUser.uid, "transactions"),
      firestoreTransaction
    );
    setTransactions((prev) => [{ id: docRef.id, ...newTransaction }, ...prev]);
    showTemporaryReceiptSuccess(
      `Receipt added: ${receiptPreview.merchant} (${formatCurrency(receiptPreview.amount)}) • Saved to ${getFinancialYearLabelFromDate(safeDate)}`
    );
    resetReceiptInputs();
    if (shouldFlag(receiptPreview.category)) {
      setTimeout(() => {
        setHmrcFlagTransaction({
          id: docRef.id,
          text: receiptPreview.merchant,
          amount: Number(receiptPreview.amount) || 0,
          category: receiptPreview.category
        });
      }, 800);
    }
  };

  const cancelReceiptReview = () => resetReceiptInputs();

  const deleteTransaction = async (id) => {
    const confirmed = window.confirm("Delete this transaction?");
    if (!confirmed) return;
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "transactions", id));
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  };

  const clearAllTransactions = async () => {
    const confirmed = window.confirm("Are you sure you want to delete all transactions?");
    if (!confirmed) return;
    if (!currentUser) return;
    try {
      const snapshot = await getDocs(collection(db, "users", currentUser.uid, "transactions"));
      const deletePromises = snapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, "users", currentUser.uid, "transactions", docSnap.id))
      );
      await Promise.all(deletePromises);
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
      date: transaction.date ? new Date(transaction.date).toISOString().split("T")[0] : "",
      type: transaction.type || "expense"
    });
  };

  const saveEdit = async (id) => {
    if (!currentUser) return;
    const updatedTransaction = {
      text: editForm.text,
      category: editForm.category,
      amount: Number(editForm.amount),
      date: editForm.date,
      type: editForm.type,
    };
    try {
      await updateDoc(
        doc(db, "users", currentUser.uid, "transactions", id),
        updatedTransaction
      );
      setTransactions((prev) =>
        prev.map((item) => item.id === id ? { ...item, ...updatedTransaction } : item)
      );
    } catch (error) {
      console.error("Failed to update transaction:", error);
    }
    setEditingId(null);
    setEditForm({ text: "", category: "", amount: "", date: "", type: "expense" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ text: "", category: "", amount: "", date: "", type: "expense" });
  };

  const { start: fyStart, end: fyEnd } = getFinancialYearRange(selectedFinancialYear);
  const financialYearTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= fyStart && transactionDate <= fyEnd;
  });

  const totalIncome = financialYearTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const totalExpenses = financialYearTransactions
    .filter((t) => t.type !== "income")
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  // ── ALLOWABLE EXPENSES — excludes personal and never-allowable ──
  const allowableExpenses = financialYearTransactions
    .filter((t) => {
      if (t.type === "income") return false;
      if (t.hmrcStatus === "overridden") return true;
      if (t.hmrcStatus === "personal") return false;
      if (t.category === "Personal") return false;
      const allowability = getCategoryAllowability(t.category);
      return allowability !== "never";
    })
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const nonAllowableExpenses = totalExpenses - allowableExpenses;
  const profit = totalIncome - totalExpenses;
  const taxableProfit = totalIncome - allowableExpenses;
  // eslint-disable-next-line no-unused-vars
const businessProfit = profit;


  // eslint-disable-next-line no-unused-vars
const otherIncomeTotal = otherIncomeSources.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0), 0
  );
 

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTransactions = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const monthlyExpenses = monthlyTransactions
  .filter((t) => {
    if (t.type === "income") return false;
    if (t.hmrcStatus === "personal") return false;
    if (t.category === "Personal") return false;
    const allowability = getCategoryAllowability(t.category);
    return t.hmrcStatus === "overridden" || allowability !== "never";
  })
  .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

const monthlyProfit = monthlyIncome - monthlyExpenses;

// ── SNAPSHOT MONTH CALCULATIONS ──
const snapshotMonthIndex = snapshotMonth.getMonth();
const snapshotYear = snapshotMonth.getFullYear();

const snapshotTransactions = transactions.filter(t => {
  const d = new Date(t.date);
  return d.getMonth() === snapshotMonthIndex && d.getFullYear() === snapshotYear;
});

const snapshotIncome = snapshotTransactions
  .filter(t => t.type === "income")
  .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

const snapshotExpenses = snapshotTransactions
  .filter(t => {
    if (t.type === "income") return false;
    if (t.hmrcStatus === "personal") return false;
    if (t.category === "Personal") return false;
    const allowability = getCategoryAllowability(t.category);
    return t.hmrcStatus === "overridden" || allowability !== "never";
  })
  .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

const snapshotProfit = snapshotIncome - snapshotExpenses;

const prevSnapshotMonth = new Date(snapshotMonth);
prevSnapshotMonth.setMonth(prevSnapshotMonth.getMonth() - 1);
const prevMonthIndex = prevSnapshotMonth.getMonth();
const prevMonthYear = prevSnapshotMonth.getFullYear();

const prevSnapshotTransactions = transactions.filter(t => {
  const d = new Date(t.date);
  return d.getMonth() === prevMonthIndex && d.getFullYear() === prevMonthYear;
});

const prevSnapshotIncome = prevSnapshotTransactions
  .filter(t => t.type === "income")
  .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

const prevSnapshotExpenses = prevSnapshotTransactions
  .filter(t => {
    if (t.type === "income") return false;
    if (t.hmrcStatus === "personal") return false;
    if (t.category === "Personal") return false;
    const allowability = getCategoryAllowability(t.category);
    return t.hmrcStatus === "overridden" || allowability !== "never";
  })
  .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

const prevSnapshotProfit = prevSnapshotIncome - prevSnapshotExpenses;

const calcChange = (current, previous) => {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
};

const incomeChangeSnapshot = calcChange(snapshotIncome, prevSnapshotIncome);
const expenseChangeSnapshot = calcChange(snapshotExpenses, prevSnapshotExpenses);
const profitChangeSnapshot = calcChange(snapshotProfit, prevSnapshotProfit);

// ── MTD QUARTERLY CALCULATIONS ──
const getMTDQuarters = (fyLabel) => {
  const startYear = parseInt(fyLabel.split("/")[0]);
  return [
    {
      label: "Q1",
      start: new Date(startYear, 3, 6),
      end: new Date(startYear, 6, 5),
      deadline: new Date(startYear, 7, 7),
      period: `6 Apr — 5 Jul ${startYear}`
    },
    {
      label: "Q2",
      start: new Date(startYear, 6, 6),
      end: new Date(startYear, 9, 5),
      deadline: new Date(startYear, 10, 7),
      period: `6 Jul — 5 Oct ${startYear}`
    },
    {
      label: "Q3",
      start: new Date(startYear, 9, 6),
      end: new Date(startYear + 1, 0, 5),
      deadline: new Date(startYear + 1, 1, 7),
      period: `6 Oct — 5 Jan ${startYear + 1}`
    },
    {
      label: "Q4",
      start: new Date(startYear + 1, 0, 6),
      end: new Date(startYear + 1, 3, 5),
      deadline: new Date(startYear + 1, 4, 7),
      period: `6 Jan — 5 Apr ${startYear + 1}`
    }
  ];
};

const mtdQuarters = getMTDQuarters(selectedFinancialYear);
const todayDate = new Date();

const getQuarterData = (quarter) => {
  const qTransactions = financialYearTransactions.filter(t => {
    const d = new Date(t.date);
    return d >= quarter.start && d <= quarter.end;
  });
  const income = qTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const expenses = qTransactions
    .filter(t => {
      if (t.type === "income") return false;
      if (t.hmrcStatus === "personal") return false;
      if (t.category === "Personal") return false;
      const allowability = getCategoryAllowability(t.category);
      return t.hmrcStatus === "overridden" || allowability !== "never";
    })
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  return { income, expenses, profit: income - expenses };
};

// Download quarterly summary as CSV
const downloadQuarterSummary = (quarter) => {
  const data = getQuarterData(quarter);
  const rows = [
    ["MTD Quarterly Summary — Enyi"],
    [""],
    ["Quarter", quarter.label],
    ["Period", quarter.period],
    ["Deadline", quarter.deadline.toLocaleDateString("en-GB")],
    ["Financial Year", selectedFinancialYear],
    [""],
    ["INCOME"],
    ["Total income", `£${data.income.toFixed(2)}`],
    [""],
    ["EXPENSES (HMRC Allowable)"],
    ["Total allowable expenses", `£${data.expenses.toFixed(2)}`],
    [""],
    ["PROFIT"],
    ["Taxable profit", `£${data.profit.toFixed(2)}`],
    [""],
    ["Generated by Enyi — enyi.ai"],
    ["This summary is formatted for MTD ITSA compliance."],
    ["Submit via HMRC-compatible software or give to your accountant."]
  ];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `enyi-mtd-${quarter.label}-${selectedFinancialYear.replace("/", "-")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
    

  const filteredHistoryTransactions = financialYearTransactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

 const categoryTotals = {};
financialYearTransactions
  .filter((t) => t.type !== "income")
  .forEach((t) => {
    const amount = parseFloat(t.amount) || 0;
    if (!categoryTotals[t.category]) categoryTotals[t.category] = 0;
    categoryTotals[t.category] += amount;
  });

// Track which categories have been overridden or marked personal
const overriddenCategories = new Set(
  financialYearTransactions
    .filter(t => t.type !== "income" && t.hmrcStatus === "overridden")
    .map(t => t.category)
);

const personalCategories = new Set(
  financialYearTransactions
    .filter(t => t.type !== "income" && (t.hmrcStatus === "personal" || t.category === "Personal"))
    .map(t => t.category)
);


  const maxCategoryAmount = Math.max(...Object.values(categoryTotals), 0);

  const otherAnnualIncome = otherIncomeSources.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0), 0
  );

  // ── TAX USES TAXABLE PROFIT (allowable expenses only) ──
  const estimatedProfit = Math.max(taxableProfit, 0);
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
      const higherSlice = Math.min(remaining, higherBandTaxableLimit - basicBand);
      tax += higherSlice * 0.4;
      remaining -= higherSlice;
    }
    if (remaining > 0) tax += remaining * 0.45;
    return tax;
  };

  const calculateClass4NI = (profits) => {
    if (profits <= 12570) return 0;
    let ni = 0;
    const mainBandUpper = 50270;
    const mainSlice = Math.min(profits, mainBandUpper) - 12570;
    if (mainSlice > 0) ni += mainSlice * 0.06;
    if (profits > mainBandUpper) ni += (profits - mainBandUpper) * 0.02;
    return ni;
  };

  const estimatedIncomeTax = calculateIncomeTax(taxableIncome);
  const estimatedClass4NI = calculateClass4NI(estimatedProfit);
  const estimatedTotalTax = estimatedIncomeTax + estimatedClass4NI;
  const monthlyTaxPot = estimatedTotalTax / 12;

  // --- CATEGORY ANALYSIS ---
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topSpendCategory = sortedCategories[0];
  const secondSpendCategory = sortedCategories[1];

  // --- MONTH-ON-MONTH ---
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthTransactions = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  });
  const lastMonthExpenses = lastMonthTransactions
    .filter((t) => t.type !== "income")
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const lastMonthIncome = lastMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const expenseChange = lastMonthExpenses > 0
    ? Math.round(((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100) : null;
  const incomeChange = lastMonthIncome > 0
    ? Math.round(((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100) : null;

  const today = new Date();
  const fyStartDate = new Date(`${selectedFinancialYear.split("/")[0]}-04-06`);
  const daysElapsed = Math.max(1, Math.floor((today - fyStartDate) / (1000 * 60 * 60 * 24)));
  const profitMargin = totalIncome > 0 ? Math.round((taxableProfit / totalIncome) * 100) : 0;

  const topCatAnnualised = topSpendCategory
    ? Math.round((topSpendCategory[1] / daysElapsed) * 365) : 0;

  const nonAllowableCategories = ["Groceries", "Mortgage", "Clothing", "Shopping"];
  const flaggedCategories = sortedCategories.filter(([cat]) => nonAllowableCategories.includes(cat));

  // --- NARRATIVE ---
  const narrativeParts = [];

  if (incomeChange !== null) {
    const incomeDirection = incomeChange >= 0 ? "up" : "down";
    narrativeParts.push(
      `📈 Income this month is ${formatCurrency(monthlyIncome)} — ${Math.abs(incomeChange)}% ${incomeDirection} compared to last month (${formatCurrency(lastMonthIncome)}).`
    );
  } else {
    narrativeParts.push(`📈 Income this month: ${formatCurrency(monthlyIncome)}.`);
  }

  if (expenseChange !== null) {
    const expDirection = expenseChange >= 0 ? "up" : "down";
    narrativeParts.push(
      `💸 Your expenses are ${Math.abs(expenseChange)}% ${expDirection} vs last month (${formatCurrency(lastMonthExpenses)} → ${formatCurrency(monthlyExpenses)}). ${expenseChange > 15 ? "This is a significant rise — review your spending below." : ""}`
    );
  }

  if (topSpendCategory) {
    narrativeParts.push(
      `🔍 Your largest expense category is ${topSpendCategory[0]} at ${formatCurrency(topSpendCategory[1])} this tax year. At this rate, you are on track to spend ${formatCurrency(topCatAnnualised)} on ${topSpendCategory[0]} annually.`
    );
  }

  if (secondSpendCategory) {
    narrativeParts.push(
      `📂 Your second largest category is ${secondSpendCategory[0]} at ${formatCurrency(secondSpendCategory[1])}.`
    );
  }

  if (totalIncome > 0) {
    const marginComment = profitMargin >= 50
      ? "This is a healthy margin — keep monitoring expenses."
      : profitMargin >= 30
      ? "Your margin is acceptable but there is room to improve."
      : "Your profit margin is under pressure. Review your largest expense categories.";
    narrativeParts.push(
      `📊 Your profit margin is ${profitMargin}% (${formatCurrency(profit)} profit on ${formatCurrency(totalIncome)} income). ${marginComment}`
    );
  }

  // ── GOAL COACHING ──
if (goalProfit && goalProfit > 0) {
const goalPercent = Math.round((taxableProfit / goalProfit) * 100);
const remaining = goalProfit - taxableProfit;

  const fyEnd = new Date(`20${selectedFinancialYear.split("/")[1]}-04-05`);
  const daysLeft = Math.max(0, Math.floor((fyEnd - new Date()) / (1000 * 60 * 60 * 24)));
  const monthsLeft = Math.max(1, Math.round(daysLeft / 30));
  const neededPerMonth = remaining > 0 ? Math.round(remaining / monthsLeft) : 0;

  if (profit >= goalProfit) {
    narrativeParts.push(
      `🎉 Goal achieved: You've hit your ${formatCurrency(goalProfit)} profit goal for ${selectedFinancialYear}. Outstanding work. Consider setting a stretch target in Settings.`
    );
  } else if (goalPercent >= 70) {
    narrativeParts.push(
      `🎯 Goal progress: You're ${goalPercent}% toward your ${formatCurrency(goalProfit)} goal. ${formatCurrency(remaining)} remaining — you need ${formatCurrency(neededPerMonth)} profit per month over the next ${monthsLeft} months to hit your target.`
    );
  } else {
    narrativeParts.push(
      `⚠️ Goal alert: You're ${goalPercent}% toward your ${formatCurrency(goalProfit)} annual goal. To get back on track you need ${formatCurrency(neededPerMonth)} profit per month for the next ${monthsLeft} months. Review your biggest expense categories below.`
    );
  }
}


  const today12m = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const rolling12mIncome = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === "income" && d >= twelveMonthsAgo && d <= today12m;
    })
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const vatExceeded = rolling12mIncome >= 90000;
  const vatApproaching = rolling12mIncome >= 76500 && !vatExceeded;

  if (vatExceeded) {
    narrativeParts.push(
      `🚨 VAT Registration Required: Your taxable turnover in the last 12 months is ${formatCurrency(rolling12mIncome)} — you have exceeded the £90,000 VAT threshold. You must register for VAT with HMRC immediately.`
    );
  } else if (vatApproaching) {
    narrativeParts.push(
      `⚠️ VAT Warning: Your taxable turnover in the last 12 months is ${formatCurrency(rolling12mIncome)} — you are approaching the £90,000 VAT registration threshold.`
    );
  }

  if (flaggedCategories.length > 0) {
    const flagList = flaggedCategories.map(([cat, amt]) => `${cat} (${formatCurrency(amt)})`).join(", ");
    narrativeParts.push(
      `🚨 HMRC Alert: You have spending in categories that may not be fully tax-allowable: ${flagList}. These are excluded from your tax calculation. Review them in Transaction History.`
    );
  }

  if (nonAllowableExpenses > 0) {
    narrativeParts.push(
      `📋 ${formatCurrency(nonAllowableExpenses)} of your expenses are excluded from your tax calculation. Your HMRC-allowable expenses are ${formatCurrency(allowableExpenses)}.`
    );
  }

  if (estimatedTotalTax > 0) {
    narrativeParts.push(
      `💰 Action: Set aside ${formatCurrency(monthlyTaxPot)} this month for your tax pot. Your estimated total tax liability is ${formatCurrency(estimatedTotalTax)}.`
    );
  }

  const financialNarrative = narrativeParts.join("\n\n");

  const groupedHistoryTransactions = filteredHistoryTransactions.reduce((groups, transaction) => {
    const date = new Date(transaction.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(transaction);
    return groups;
  }, {});

  const sortedHistoryMonths = Object.keys(groupedHistoryTransactions).sort((a, b) => {
    const [yearA, monthA] = a.split("-").map(Number);
    const [yearB, monthB] = b.split("-").map(Number);
    return new Date(yearB, monthB) - new Date(yearA, monthA);
  });

  const getHistoryMonthSummary = (monthTransactions) => {
    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const expenses = monthTransactions
      .filter((t) => t.type !== "income")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    return { income, expenses, profit: income - expenses };
  };

  const downloadCSV = () => {
    if (transactions.length === 0) { alert("No transactions to download."); return; }
    let exportTransactions = [...transactions];
    const today = new Date();
    if (csvRange === "3months") {
      const start = new Date(); start.setMonth(start.getMonth() - 3);
      exportTransactions = exportTransactions.filter((t) => new Date(t.date) >= start && new Date(t.date) <= today);
    }
    if (csvRange === "6months") {
      const start = new Date(); start.setMonth(start.getMonth() - 6);
      exportTransactions = exportTransactions.filter((t) => new Date(t.date) >= start && new Date(t.date) <= today);
    }
    if (csvRange === "custom") {
      if (!csvStartDate || !csvEndDate) { alert("Please select both start and end dates."); return; }
      const start = new Date(`${csvStartDate}T00:00:00`);
      const end = new Date(`${csvEndDate}T23:59:59`);
      exportTransactions = exportTransactions.filter((t) => new Date(t.date) >= start && new Date(t.date) <= end);
    }
    const headers = ["Text", "Type", "Category", "Amount", "Date", "HMRC Status", "Override Reason"];
    const rows = exportTransactions.map((t) => [
      t.text, t.type, t.category, t.amount, t.date,
      t.hmrcStatus || "", t.hmrcOverrideReason || ""
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const userName = currentUser?.displayName?.replace(/\s+/g, "-").toLowerCase() || "user";
    const downloadDate = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `${userName}-transactions-${downloadDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleMonth = (monthKey) => {
    setExpandedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  // eslint-disable-next-line no-unused-vars
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
      return [...prev, { id: Date.now(), type: otherIncomeType, amount: parsedAmount }];
    });
    setOtherIncomeAmount("");
  };

  // eslint-disable-next-line no-unused-vars  
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
    const taxYearStart = new Date(year, 3, 6);
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
    if (dateString.includes("T")) return new Date(dateString).toISOString();
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const safeDate = new Date(Number(year), Number(month) - 1, Number(day));
      return safeDate.toISOString();
    }
    const fallback = new Date(dateString);
    return isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error(error);
    }
  };

  const generateInsights = useCallback(() => {
    if (transactions.length === 0) { setInsights([]); return; }
    const generated = [];
    const now = new Date();
    const thisMonthTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const expenseTransactions = thisMonthTransactions.filter((t) => t.type !== "income");
    const monthlyCategoryTotals = {};
    expenseTransactions.forEach((t) => {
      const cat = t.category || "Misc";
      monthlyCategoryTotals[cat] = (monthlyCategoryTotals[cat] || 0) + Number(t.amount);
    });
    const topCategory = Object.entries(monthlyCategoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      generated.push({
        type: "spending", title: "Spending Insight",
        message: `${topCategory[0]} spending is £${topCategory[1].toFixed(2)} this month. Review this category for recurring costs.`
      });
    }
    if (totalIncome >= 70000) {
      generated.push({
        type: "vat", title: "VAT Threshold Alert",
        message: `You are on track to earn £${totalIncome.toFixed(0)} this tax year. You may approach the £90,000 VAT threshold soon.`
      });
    }
    if (profit > 0 && profit < totalIncome * 0.3) {
      generated.push({
        type: "profit", title: "Profit Margin Alert",
        message: "Your expenses are consuming a large portion of your revenue this year."
      });
    }
    generated.push({
      type: "summary", title: "Monthly Summary",
      message: `This month you earned £${monthlyIncome.toFixed(2)} and spent £${monthlyExpenses.toFixed(2)}. Net position: £${monthlyProfit.toFixed(2)}.`
    });
    setInsights(generated);
  }, [transactions, totalIncome, monthlyIncome, monthlyExpenses, monthlyProfit, profit]);

  useEffect(() => { generateInsights(); }, [transactions, generateInsights]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

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
              <p className="brand-tagline">Your AI finance partner</p>
            </div>
          </div>
          <div className="nav-menu-wrapper">
            <button className="nav-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation menu">
              <FiMenu size={24} />
            </button>
            {menuOpen && (
  <div className="nav-dropdown">
  <button onClick={() => scrollToSection("add-transaction")}>Add Transaction</button>
  <button onClick={() => scrollToSection("receipts")}>Receipts</button>
  <button onClick={() => scrollToSection("your-numbers")}>Your Numbers</button>
  <button onClick={() => scrollToSection("spending-categories")}>Spending Categories</button>
  <button onClick={() => scrollToSection("enyi-ai")}>Enyi AI</button>
  <button onClick={() => scrollToSection("transaction-history")}>Transaction History</button>
  <div className="nav-divider" />
<button onClick={() => { setShowSettings(true); setMenuOpen(false); }}>
  ⚙️ Settings
</button>
<div className="nav-divider" />
<button className="nav-signout" onClick={handleSignOut}>Sign Out</button>

              </div>
            )}
          </div>
        </header>

        <section className="hero-card">
          <div className="hero-grid">
            <div className="hero-left">
              <h2 className="hero-title">Your money,<br />organised.</h2>
              <p className="hero-subtitle">
                Bookkeeping, tax clarity and personalised AI guidance for smarter business growth.
              </p>
            </div>
            <div className="hero-right">
              <div className="hero-balance-card">
  <span className="hero-balance-label">Profit this year</span>
<h3 className="hero-balance-value">{formatCurrency(taxableProfit)}</h3>
<p style={{
  margin: "4px 0 0 0",
  fontSize: "12px",
  color: "rgba(255,255,255,0.5)",
  fontWeight: 500
}}>
  After business expenses only
</p>

  {goalProfit ? (
    <div className="hero-goal-block">
      <div className="hero-goal-track">
        <div
          className="hero-goal-fill"
          style={{
            width: `${Math.min((taxableProfit / goalProfit) * 100, 100)}%`,
            background: profit >= goalProfit
              ? "#10b981"
              : profit >= goalProfit * 0.7
              ? "#2fe1c2"
              : "#f59e0b"
          }}
        />
      </div>
      <p className="hero-goal-text">
        {profit >= goalProfit ? (
          <span style={{ color: "#10b981", fontWeight: 700 }}>
            🎉 Goal reached! You hit your {formatCurrency(goalProfit)} target
          </span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.7)" }}>
  {Math.round((taxableProfit / goalProfit) * 100)}% of your{" "}
  £{Number(goalProfit).toLocaleString("en-GB")} goal
  {" • "}
  {formatCurrency(goalProfit - taxableProfit)} to go
</span>

        )}
      </p>
    </div>
  ) : (
    <p
      className="hero-goal-prompt"
      onClick={() => setShowGoalSetup(true)}
    >
      + Set your profit goal for {selectedFinancialYear}
    </p>
  )}
</div>
            </div>
          </div>
        </section>

        <section className="overview-strip">
          <div className="overview-pill">
  <span className="overview-kicker">This Year's Income</span>
  <strong>{formatCurrency(totalIncome)}</strong>
</div>

<div className="overview-pill">
  <span className="overview-kicker">Business Expenses</span>
  <strong>{formatCurrency(allowableExpenses)}</strong>
</div>

<div className="overview-pill">
  <span className="overview-kicker">
    {new Date().toLocaleString("en-GB", { month: "long" })}'s Profit
  </span>
  <strong>{formatCurrency(monthlyProfit)}</strong>
</div>

<div className="overview-pill">
  <span className="overview-kicker">Tax Pot this month</span>
  <strong>
    {formatCurrency(monthlyTaxPot)}
  </strong>
</div>


        </section>

        <section className="insight-strip">
          <div className="insight-strip-left">
            <div className="insight-ai-badge">Enyi AI</div>
            <div className="insight-copy">
              <h3>Business Insight</h3>
              <p>Automated financial intelligence based on your recent activity</p>
            </div>
          </div>
          <button className="insight-expand-button" onClick={() => setShowInsight(!showInsight)}>
            {showInsight ? "Hide" : "View"}
          </button>
        </section>

        {showInsight && (
          <div className="insight-expanded-card">
            {financialNarrative.split("\n\n").map((point, index) => (
              <p key={index} style={{ marginBottom: "12px", lineHeight: "1.6" }}>{point}</p>
            ))}
          </div>
        )}

<section className="top-grid">

  {/* ── ADD TRANSACTION ── */}
  <div id="add-transaction" className="fin-card action-card">
    <div className="action-card-header">
      <div className="action-card-icon-wrap">
        <span className="action-card-icon">＋</span>
      </div>
      <div>
        <h2 className="action-card-title">Add Transaction</h2>
        <p className="action-card-sub">Log income or expenses instantly</p>
      </div>
    </div>

    <div className="action-type-toggle">
      <button
        className={`toggle-btn ${transactionType === "expense" ? "toggle-active" : ""}`}
        onClick={() => setTransactionType("expense")}
        type="button"
      >
        Expense
      </button>
      <button
        className={`toggle-btn ${transactionType === "income" ? "toggle-active" : ""}`}
        onClick={() => setTransactionType("income")}
        type="button"
      >
        Income
      </button>
    </div>

    <input
      type="text"
      placeholder={transactionType === "income"
        ? "e.g. Client fee £350"
        : "e.g. Uber £25"}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && addTransaction()}
      className="fin-input action-input"
    />

    <input
      type="date"
      value={transactionDate}
      onChange={(e) => setTransactionDate(e.target.value)}
      className="fin-input"
    />

    <button onClick={addTransaction} className="primary-button action-submit-btn">
      Add {transactionType === "income" ? "Income" : "Expense"}
    </button>

    {statusMessage && <p className="status-text">{statusMessage}</p>}
    {transactionSuccessMessage && (
      <p className="success-text">{transactionSuccessMessage}</p>
    )}
  </div>

  {/* ── RECEIPTS ── */}
  <div id="receipts" className="fin-card receipt-card">
    <div className="action-card-header">
      <div className="action-card-icon-wrap receipt-icon-wrap">
        <span className="action-card-icon">🧾</span>
      </div>
      <div>
        <h2 className="action-card-title">Receipts</h2>
        <p className="action-card-sub">Scan or upload — Enyi reads it for you</p>
      </div>
    </div>

    <div className="receipt-upload-area">
      <label className="receipt-upload-btn receipt-camera">
        <span className="receipt-btn-icon">📷</span>
        <span className="receipt-btn-label">Take photo</span>
        <span className="receipt-btn-sub">Use your camera</span>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleReceiptSelection(e.target.files[0])}
          style={{ display: "none" }}
        />
      </label>

      <label className="receipt-upload-btn receipt-file">
        <span className="receipt-btn-icon">📁</span>
        <span className="receipt-btn-label">Upload file</span>
        <span className="receipt-btn-sub">Image or PDF</span>
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
        <p className="receipt-selected-text">📎 {receiptFile.name}</p>
        {receiptFile.type.startsWith("image/") && (
          <img
            src={URL.createObjectURL(receiptFile)}
            alt="Receipt preview"
            className="receipt-preview-image"
          />
        )}
        <button onClick={handleReceiptUpload} className="primary-button">
          Read this receipt
        </button>
      </div>
    )}

    {receiptStatus && <p className="status-text">{receiptStatus}</p>}
    {receiptSuccessMessage && <p className="success-text">{receiptSuccessMessage}</p>}

    {showReceiptReview && receiptPreview && (
      <div className="review-box">
        <h3>Review receipt</h3>
        <input className="fin-input" value={receiptPreview.merchant}
          onChange={(e) => setReceiptPreview({ ...receiptPreview, merchant: e.target.value })}
          placeholder="Merchant" />
        <input className="fin-input" value={receiptPreview.amount}
          onChange={(e) => setReceiptPreview({ ...receiptPreview, amount: e.target.value })}
          placeholder="Amount" />
        <input className="fin-input" value={receiptPreview.date}
          onChange={(e) => setReceiptPreview({ ...receiptPreview, date: e.target.value })}
          placeholder="Date" />
        <select className="fin-input" value={receiptPreview.category}
          onChange={(e) => setReceiptPreview({ ...receiptPreview, category: e.target.value })}>
          <option value="Travel">Travel (business)</option>
          <option value="Fuel">Fuel (business)</option>
          <option value="Office">Office costs</option>
          <option value="Phone">Phone & internet</option>
          <option value="Software">Software & subscriptions</option>
          <option value="Marketing">Marketing & advertising</option>
          <option value="Professional fees">Professional fees</option>
          <option value="Training">Training & CPD</option>
          <option value="Utilities">Utilities (business)</option>
          <option value="Insurance">Business insurance</option>
          <option value="Stock">Stock & materials</option>
          <option value="Wages">Staff & wages</option>
          <option value="Bank charges">Bank charges</option>
          <option value="Rent">Rent (business premises)</option>
          <option value="Food">Food & drink</option>
          <option value="Clothing">Clothing</option>
          <option value="Groceries">Groceries</option>
          <option value="Mortgage">Mortgage</option>
          <option value="Personal">Personal (non-business)</option>
          <option value="Entertainment">Client entertainment</option>
          <option value="Misc">Miscellaneous</option>
        </select>
        <div className="button-group">
          <button onClick={confirmReceiptSave} className="primary-button">Confirm Save</button>
          <button onClick={cancelReceiptReview} className="secondary-button">Cancel</button>
        </div>
      </div>
    )}
  </div>

</section>


        <section className="two-column-grid">
  <section id="your-numbers" className="fin-card your-numbers-card">

  {/* Header */}
  <div className="summary-top">
    <div>
      <h2>Your Numbers</h2>
      <p className="section-subtitle">
        Your complete financial picture for {selectedFinancialYear}
      </p>
      <div className="financial-year-row">
        <label className="financial-year-label">Financial year</label>
        <select
          value={selectedFinancialYear}
          onChange={(e) => {
            setSelectedFinancialYear(e.target.value);
            setGoalLoaded(false);
          }}
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

  {/* ── DRAWER 1 — YOUR BUSINESS ── */}
  <div className="yn-drawer">
    <button
      className="yn-drawer-header"
      onClick={() => toggleDrawer("business")}
      type="button"
    >
      <div className="yn-drawer-left">
        <div className="yn-drawer-icon" style={{ background: "linear-gradient(135deg, #09111f, #162238)" }}>💼</div>
        <div>
          <div className="yn-drawer-title">Your Business</div>
          <div className="yn-drawer-sub">Income, expenses and profit</div>
        </div>
      </div>
      <div className="yn-drawer-right">
        <span className="yn-drawer-value">{formatCurrency(taxableProfit)}</span>
        <span className={`yn-chevron ${expandedDrawers.business ? "open" : ""}`}>▾</span>
      </div>
    </button>

    {expandedDrawers.business && (
      <div className="yn-drawer-body">

        {/* Stats */}
        <div className="yn-stat-grid">
          <div className="yn-stat">
            <span className="yn-stat-label">This year's income</span>
            <span className="yn-stat-value">{formatCurrency(totalIncome)}</span>
          </div>
          <div className="yn-stat">
            <span className="yn-stat-label">Business expenses</span>
            <span className="yn-stat-value">{formatCurrency(allowableExpenses)}</span>
          </div>
          <div className="yn-stat yn-stat-highlight">
            <span className="yn-stat-label">Business profit</span>
            <span className="yn-stat-value">{formatCurrency(taxableProfit)}</span>
          </div>
          <div className="yn-stat">
            <span className="yn-stat-label">Profit margin</span>
            <span className="yn-stat-value">{profitMargin}%</span>
            <div className="yn-margin-track">
              <div
                className="yn-margin-fill"
                style={{
                  width: `${Math.min(profitMargin, 100)}%`,
                  background: profitMargin >= 50
                    ? "#10b981"
                    : profitMargin >= 30
                    ? "#f59e0b"
                    : "#ef4444"
                }}
              />
            </div>
          </div>
        </div>

        <div className="yn-divider" />

        {/* Downloads */}
        <div className="yn-downloads">
          <p className="yn-downloads-label">Downloads</p>

          {/* CSV Range */}
          <div className="yn-csv-range">
            <select
              className="fin-input yn-csv-select"
              value={csvRange}
              onChange={(e) => setCsvRange(e.target.value)}
            >
              <option value="all">All records</option>
              <option value="3months">Last 3 months</option>
              <option value="6months">Last 6 months</option>
              <option value="custom">Custom range</option>
            </select>
            {csvRange === "custom" && (
              <div className="yn-csv-dates">
                <input
                  type="date"
                  className="fin-input"
                  value={csvStartDate}
                  onChange={(e) => setCsvStartDate(e.target.value)}
                />
                <input
                  type="date"
                  className="fin-input"
                  value={csvEndDate}
                  onChange={(e) => setCsvEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Download CSV button */}
          <button className="yn-download-btn" onClick={downloadCSV} type="button">
            <div className="yn-download-left">
              <span className="yn-download-icon">📊</span>
              <div>
                <div className="yn-download-title">Download CSV</div>
                <div className="yn-download-sub">
                  Raw transaction data for your accountant
                </div>
              </div>
            </div>
            <span className="yn-download-arrow">↓</span>
          </button>

          {/* MTD Quarterly */}
          <p className="yn-mtd-label">MTD Quarterly Summaries</p>
          {mtdQuarters.map((quarter) => {
            const isComplete = todayDate > quarter.end;
            const isActive = todayDate >= quarter.start && todayDate <= quarter.end;
            const data = getQuarterData(quarter);
            const daysToDeadline = Math.max(0, Math.floor(
              (quarter.deadline - todayDate) / (1000 * 60 * 60 * 24)
            ));

            return (
              <div
                key={quarter.label}
                className={`yn-quarter-row ${!isComplete ? "yn-quarter-locked" : ""}`}
              >
                <div className="yn-quarter-left">
                  <div className={`yn-quarter-status ${
                    isComplete
                      ? "yn-status-complete"
                      : isActive
                      ? "yn-status-active"
                      : "yn-status-pending"
                  }`}>
                    {isComplete ? "✓" : isActive ? "●" : "○"}
                  </div>
                  <div>
                    <div className="yn-quarter-title">
                      {quarter.label} — {quarter.period}
                    </div>
                    <div className="yn-quarter-sub">
                      {isComplete
                        ? `Income ${formatCurrency(data.income)} • Profit ${formatCurrency(data.profit)}`
                        : isActive
                        ? `In progress • Deadline in ${daysToDeadline} days`
                        : `Starts ${quarter.start.toLocaleDateString("en-GB")}`
                      }
                    </div>
                  </div>
                </div>
                {isComplete ? (
                  <button
                    className="yn-quarter-download"
                    onClick={() => downloadQuarterSummary(quarter)}
                    type="button"
                  >
                    Download
                  </button>
                ) : (
                  <span className="yn-quarter-locked-label">
                    {isActive ? "Not yet due" : "Upcoming"}
                  </span>
                )}
              </div>
            );
          })}

          <p className="yn-mtd-note">
            MTD quarterly summaries are formatted for HMRC compliance.
            Direct submission to HMRC coming in a future update.
          </p>
        </div>
      </div>
    )}
  </div>

  {/* ── DRAWER 2 — TAX POSITION ── */}
  <div className="yn-drawer">
    <button
      className="yn-drawer-header"
      onClick={() => toggleDrawer("tax")}
      type="button"
    >
      <div className="yn-drawer-left">
        <div className="yn-drawer-icon" style={{ background: "linear-gradient(135deg, #0d9488, #2fe1c2)" }}>📊</div>
        <div>
          <div className="yn-drawer-title">Tax Position</div>
          <div className="yn-drawer-sub">Auto-calculated from your transactions</div>
        </div>
      </div>
      <div className="yn-drawer-right">
        <span className="yn-drawer-value" style={{ color: "#b91c1c" }}>
          {formatCurrency(estimatedTotalTax)}
        </span>
        <span className={`yn-chevron ${expandedDrawers.tax ? "open" : ""}`}>▾</span>
      </div>
    </button>

    {expandedDrawers.tax && (
      <div className="yn-drawer-body">
        <div className="yn-tax-calculation">

          <div className="yn-tax-row">
            <span>Taxable profit</span>
            <span>{formatCurrency(estimatedProfit)}</span>
          </div>
          <div className="yn-tax-row yn-tax-deduction">
            <span>Personal allowance</span>
            <span>− {formatCurrency(personalAllowance)}</span>
          </div>
          <div className="yn-tax-divider" />
          <div className="yn-tax-row yn-tax-subtotal">
            <span>Taxable income</span>
            <span>{formatCurrency(taxableIncome)}</span>
          </div>

          <div className="yn-tax-spacer" />

          <div className="yn-tax-row">
            <span>Income Tax</span>
            <span>{formatCurrency(estimatedIncomeTax)}</span>
          </div>
          <div className="yn-tax-row">
            <span>Class 4 National Insurance</span>
            <span>{formatCurrency(estimatedClass4NI)}</span>
          </div>
          <div className="yn-tax-divider" />
          <div className="yn-tax-row yn-tax-total">
            <span>Estimated tax bill</span>
            <span>{formatCurrency(estimatedTotalTax)}</span>
          </div>

          <div className="yn-tax-spacer" />

          <div className="yn-tax-pot-block">
            <div className="yn-tax-pot-left">
              <span className="yn-tax-pot-icon">💰</span>
              <div>
                <div className="yn-tax-pot-label">Set aside this month</div>
                <div className="yn-tax-pot-sub">To cover your annual tax bill</div>
              </div>
            </div>
            <span className="yn-tax-pot-amount">{formatCurrency(monthlyTaxPot)}</span>
          </div>

          {nonAllowableExpenses > 0 && (
            <div className="yn-tax-note-block">
              <p>
                {formatCurrency(nonAllowableExpenses)} of personal and
                non-allowable expenses are excluded from this calculation.
              </p>
            </div>
          )}

          {otherIncomeSources.length > 0 && (
            <div className="yn-other-income">
              <p className="yn-other-income-label">Other taxable income included</p>
              {otherIncomeSources.map(item => (
                <div key={item.id} className="yn-other-income-row">
                  <span>{formatIncomeTypeLabel(item.type)}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        <p className="yn-tax-disclaimer">
          Estimate only. Final tax may differ based on reliefs, allowances
          and HMRC rules.
          <span
            className="yn-settings-link"
            onClick={() => setShowSettings(true)}
          >
            {" "}Add other income in Settings →
          </span>
        </p>
      </div>
    )}
  </div>

  {/* ── DRAWER 3 — MONTHLY SNAPSHOT ── */}
  <div className="yn-drawer">
    <button
      className="yn-drawer-header"
      onClick={() => toggleDrawer("monthly")}
      type="button"
    >
      <div className="yn-drawer-left">
        <div className="yn-drawer-icon" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>📅</div>
        <div>
          <div className="yn-drawer-title">Monthly Snapshot</div>
          <div className="yn-drawer-sub">Compare month by month</div>
        </div>
      </div>
      <div className="yn-drawer-right">
        <span className="yn-drawer-value">{formatCurrency(snapshotProfit)}</span>
        <span className={`yn-chevron ${expandedDrawers.monthly ? "open" : ""}`}>▾</span>
      </div>
    </button>

    {expandedDrawers.monthly && (
      <div className="yn-drawer-body">

        {/* Month navigator */}
        <div className="yn-month-nav">
          <button
            className="yn-month-arrow"
            onClick={() => {
              const prev = new Date(snapshotMonth);
              prev.setMonth(prev.getMonth() - 1);
              setSnapshotMonth(prev);
            }}
            type="button"
          >
            ←
          </button>
          <span className="yn-month-label">
            {snapshotMonth.toLocaleString("en-GB", {
              month: "long",
              year: "numeric"
            })}
          </span>
          <button
            className="yn-month-arrow"
            onClick={() => {
              const next = new Date(snapshotMonth);
              next.setMonth(next.getMonth() + 1);
              setSnapshotMonth(next);
            }}
            type="button"
            disabled={
              snapshotMonth.getMonth() === new Date().getMonth() &&
              snapshotMonth.getFullYear() === new Date().getFullYear()
            }
          >
            →
          </button>
        </div>

        {/* Comparison table */}
        <div className="yn-snapshot-table">
          <div className="yn-snapshot-header">
            <span />
            <span className="yn-snapshot-col-current">
              {snapshotMonth.toLocaleString("en-GB", { month: "short", year: "numeric" })}
            </span>
            <span className="yn-snapshot-col-prev">
              {prevSnapshotMonth.toLocaleString("en-GB", { month: "short", year: "numeric" })}
            </span>
            <span>Change</span>
          </div>

          {[
            {
              label: "Income",
              current: snapshotIncome,
              prev: prevSnapshotIncome,
              change: incomeChangeSnapshot,
              positive: true
            },
            {
              label: "Expenses",
              current: snapshotExpenses,
              prev: prevSnapshotExpenses,
              change: expenseChangeSnapshot,
              positive: false
            },
            {
              label: "Profit",
              current: snapshotProfit,
              prev: prevSnapshotProfit,
              change: profitChangeSnapshot,
              positive: true
            }
          ].map(row => (
            <div key={row.label} className="yn-snapshot-row">
              <span className="yn-snapshot-row-label">{row.label}</span>
              <span className="yn-snapshot-col-current">
                {formatCurrency(row.current)}
              </span>
              <span className="yn-snapshot-col-prev yn-snapshot-prev">
                {formatCurrency(row.prev)}
              </span>
              <span className={`yn-snapshot-change ${
                row.change === null ? "" :
                (row.positive ? row.change >= 0 : row.change <= 0)
                  ? "yn-change-good"
                  : "yn-change-bad"
              }`}>
                {row.change === null
                  ? "—"
                  : `${row.change >= 0 ? "↑" : "↓"} ${Math.abs(row.change)}%`
                }
              </span>
            </div>
          ))}
        </div>

        <p className="yn-snapshot-note">
          Expenses shown are HMRC allowable business expenses only.
        </p>
      </div>
    )}
  </div>

</section>

  <div id="spending-categories" className="fin-card">
  <div className="section-head">
    <h2>Spending by Category</h2>
    <p>See where your money is going in {selectedFinancialYear}</p>
  </div>

  {Object.entries(categoryTotals).length === 0 ? (
    <p className="empty-text">No expense categories yet for {selectedFinancialYear}.</p>
  ) : (() => {
    const allEntries = Object.entries(categoryTotals);

    const allowableEntries = allEntries.filter(([cat]) =>
      getCategoryAllowability(cat) === "always" || overriddenCategories.has(cat)
    );

    const conditionalEntries = allEntries.filter(([cat]) =>
      getCategoryAllowability(cat) === "conditional" &&
      !overriddenCategories.has(cat) &&
      !personalCategories.has(cat)
    );

    const neverEntries = allEntries.filter(([cat]) =>
      (getCategoryAllowability(cat) === "never" || personalCategories.has(cat)) &&
      !overriddenCategories.has(cat)
    );

    const renderBar = (cat, amt) => (
      <div
        key={cat}
        className="chart-row chart-row-clickable"
        onClick={() => {
          const allowability = getCategoryAllowability(cat);
          if (allowability === "conditional" || allowability === "never") {
            const match = financialYearTransactions.find(
              t => t.type !== "income" &&
                   t.category === cat &&
                   t.hmrcStatus !== "overridden" &&
                   t.hmrcStatus !== "personal" &&
                   t.hmrcStatus !== "recategorised"
            );
            if (match) setHmrcFlagTransaction(match);
          }
        }}
      >
        <div className="chart-row-top">
          <span className="cat-label">{cat}</span>
          <span className="cat-amount">{formatCurrency(amt)}</span>
        </div>
        <div className="chart-track">
          <div
            className="chart-fill-premium"
            style={{
              width: maxCategoryAmount > 0 ? `${(amt / maxCategoryAmount) * 100}%` : "0%",
              background: overriddenCategories.has(cat)
                ? "#10b981"
                : getCategoryAllowability(cat) === "always"
                ? "#10b981"
                : getCategoryAllowability(cat) === "conditional"
                ? "#f59e0b"
                : "#ef4444"
            }}
          />
        </div>
      </div>
    );

    const SectionHeader = ({ type, label, total, count }) => {
      const isOpen = expandedCategories[type];
      const colors = {
        always: { bg: "#f0fdf4", border: "#bbf7d0", text: "#065f46", accent: "#10b981" },
        conditional: { bg: "#fffbeb", border: "#fde68a", text: "#78350f", accent: "#f59e0b" },
        never: { bg: "#fff5f5", border: "#fecaca", text: "#7f1d1d", accent: "#ef4444" }
      };
      const c = colors[type];

      return (
        <button
          className="cat-section-header"
          onClick={() => toggleCategorySection(type)}
          style={{ background: c.bg, borderColor: c.border }}
          type="button"
        >
          <div className="cat-section-header-left">
            <div className="cat-section-dot" style={{ background: c.accent }} />
            <span className="cat-section-label" style={{ color: c.text }}>
              {label}
            </span>
            <span className="cat-section-count" style={{ color: c.accent }}>
              {count} {count === 1 ? "category" : "categories"}
            </span>
          </div>
          <div className="cat-section-header-right">
            <span className="cat-section-total" style={{ color: c.text }}>
              {formatCurrency(total)}
            </span>
            <span
              className="cat-section-chevron"
              style={{
                color: c.text,
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
              }}
            >
              ▾
            </span>
          </div>
        </button>
      );
    };

    return (
      <div className="category-sections">


        {/* ALLOWABLE */}
        {allowableEntries.length > 0 && (
          <div className="cat-section">
            <SectionHeader
              type="always"
              label="Reduces your tax bill"
              total={allowableEntries.reduce((s, [, a]) => s + a, 0)}
              count={allowableEntries.length}
            />
            {expandedCategories.always && (
              <div className="cat-section-body">
                {allowableEntries.map(([cat, amt]) => renderBar(cat, amt))}
              </div>
            )}
          </div>
        )}

        {/* CONDITIONAL */}
        {conditionalEntries.length > 0 && (
          <div className="cat-section">
            <SectionHeader
              type="conditional"
            label="Needs a quick check"
              total={conditionalEntries.reduce((s, [, a]) => s + a, 0)}
              count={conditionalEntries.length}
            />
            {expandedCategories.conditional && (
              <div className="cat-section-body">
                <p className="cat-section-note">
                 These could reduce your tax bill — but only if they were genuinely for work. Tap any item to confirm it or move it to personal.
                </p>
                {conditionalEntries.map(([cat, amt]) => renderBar(cat, amt))}
              </div>
            )}
          </div>
        )}

        {/* NOT ALLOWABLE */}
        {neverEntries.length > 0 && (
          <div className="cat-section">
            <SectionHeader
              type="never"
              label="Personal — no tax benefit"
              total={neverEntries.reduce((s, [, a]) => s + a, 0)}
              count={neverEntries.length}
            />
            {expandedCategories.never && (
              <div className="cat-section-body">
                <p className="cat-section-note">
                 HMRC won't accept these as business expenses so they don't reduce your tax. If something is here by mistake, tap it to move it.
                </p>
                {neverEntries.map(([cat, amt]) => renderBar(cat, amt))}
              </div>
            )}
          </div>
        )}

      </div>
    );
  })()}
</div>

        </section>


        <div id="enyi-ai" className="fin-card"></div>
        <AIChatPanel selectedFinancialYear={selectedFinancialYear} transactions={transactions} />

        <section id="transaction-history" className="fin-card">
          <div className="section-head">
            <h2 className="section-title">Transaction History</h2>
            <p>Review and manage your records for {selectedFinancialYear}</p>
          </div>
          {sortedHistoryMonths.length === 0 ? (
            <p className="empty-text">No transactions found for {selectedFinancialYear}.</p>
          ) : (
            <div className="history-grouped-list">
              {sortedHistoryMonths.map((monthKey) => {
                const monthTransactions = groupedHistoryTransactions[monthKey];
                const monthSummary = getHistoryMonthSummary(monthTransactions);
                const [year, month] = monthKey.split("-").map(Number);
                const monthLabel = new Date(year, month).toLocaleString("en-GB", { month: "long", year: "numeric" });
                const isExpanded = !!expandedMonths[monthKey];

                return (
                  <div key={monthKey} className="month-group">
                    <button type="button" className="month-group-header month-toggle" onClick={() => toggleMonth(monthKey)}>
                      <div>
                        <h3 className="month-group-title">{monthLabel}</h3>
                        <p className="month-group-subtitle">
                          {monthTransactions.length} transaction{monthTransactions.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="month-group-summary-wrap">
                        <div className="month-group-summary">
                          <span className="month-summary-item">Income {formatCurrency(monthSummary.income)}</span>
                          <span className="month-summary-item">Expenses {formatCurrency(monthSummary.expenses)}</span>
                          <strong className={`month-summary-net ${monthSummary.profit < 0 ? "negative" : "positive"}`}>
                            Net {formatCurrency(monthSummary.profit)}
                          </strong>
                        </div>
                        <span className={`month-chevron ${isExpanded ? "open" : ""}`}>▾</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="history-list">
                        {monthTransactions.map((transaction) => (
                          <div key={transaction.id} className="history-item">
                            {editingId === transaction.id ? (
                              <div>
                                <input value={editForm.text}
                                  onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                                  className="fin-input" />
                                <select value={editForm.type}
                                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                  className="fin-input">
                                  <option value="expense">Expense</option>
                                  <option value="income">Income</option>
                                </select>
                                <select value={editForm.category}
                                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                  className="fin-input">
                                  <option value="">Select category</option>
                                  <option value="Income">Income</option>
                                  <option value="Travel">Travel (business)</option>
                                  <option value="Fuel">Fuel (business)</option>
                                  <option value="Office">Office costs</option>
                                  <option value="Phone">Phone & internet</option>
                                  <option value="Software">Software & subscriptions</option>
                                  <option value="Marketing">Marketing & advertising</option>
                                  <option value="Professional fees">Professional fees</option>
                                  <option value="Training">Training & CPD</option>
                                  <option value="Utilities">Utilities (business)</option>
                                  <option value="Insurance">Business insurance</option>
                                  <option value="Stock">Stock & materials</option>
                                  <option value="Wages">Staff & wages</option>
                                  <option value="Bank charges">Bank charges</option>
                                  <option value="Rent">Rent (business premises)</option>
                                  <option value="Food">Food & drink</option>
                                  <option value="Clothing">Clothing</option>
                                  <option value="Groceries">Groceries</option>
                                  <option value="Mortgage">Mortgage</option>
                                  <option value="Personal">Personal (non-business)</option>
                                  <option value="Entertainment">Client entertainment</option>
                                  <option value="Misc">Miscellaneous</option>
                                </select>
                                <input value={editForm.amount}
                                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                  className="fin-input" />
                                <input type="date" value={editForm.date}
                                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                  className="fin-input" />
                                <div className="button-group">
                                  <button onClick={() => saveEdit(transaction.id)} className="primary-button">Save</button>
                                  <button onClick={cancelEdit} className="secondary-button">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="history-item-inner">
                                <div className="history-left">
                                  <div className="history-title">{transaction.text}</div>
                                  <div className="history-meta">{new Date(transaction.date).toLocaleDateString()}</div>

                                  <div className="history-chip-row">
                                    <span className={`category-chip ${getCategoryColor(transaction.category)}`}>
                                      {transaction.category}
                                    </span>
                                    <span className={`type-chip ${transaction.type === "income" ? "type-income" : "type-expense"}`}>
                                      {transaction.type}
                                    </span>

                                    {/* ── HMRC STATUS BADGE ── */}
                                    {transaction.type !== "income" && (() => {
                                      const status = transaction.hmrcStatus;
                                      if (status === "overridden") {
                                        return (
                                          <span className="hmrc-badge hmrc-badge-overridden" title={transaction.hmrcOverrideReason}>
                                            ✓ Allowable
                                          </span>
                                        );
                                      }
                                      if (status === "personal") {
                                        return <span className="hmrc-badge hmrc-badge-personal">Personal</span>;
                                      }
                                      if (status === "recategorised") return null;
                                      const allowability = getCategoryAllowability(transaction.category);
                                      if (allowability === "never") {
                                        return <span className="hmrc-badge hmrc-badge-never">🚨 Not allowable</span>;
                                      }
                                      if (allowability === "conditional") {
                                        return <span className="hmrc-badge hmrc-badge-conditional">⚠️ Check HMRC</span>;
                                      }
                                      return null;
                                    })()}
                                  </div>

                                  {/* ── HMRC QUICK ACTIONS ── */}
                                  {transaction.type !== "income" && (() => {
                                    const allowability = getCategoryAllowability(transaction.category);
                                    const status = transaction.hmrcStatus;
                                    if (status === "overridden") {
                                      return (
                                        <div className="hmrc-allowable-confirmed">
                                          <span style={{ fontSize: "12px", color: "#065f46" }}>
                                            ✓ {transaction.hmrcOverrideReason}
                                          </span>
                                        </div>
                                      );
                                    }
                                    if (status === "personal") return null;
                                    if (status === "recategorised") return null;
                                    if (allowability === "never" || allowability === "conditional") {
                                      return (
                                        <div className="hmrc-quick-actions">
                                          <button
                                            className="hmrc-quick-btn hmrc-quick-allowable"
                                            onClick={() => setHmrcFlagTransaction({ ...transaction, quickMode: "confirm" })}
                                            type="button"
                                          >
                                            + Add to allowable
                                          </button>
                                          <button
                                            className="hmrc-quick-btn hmrc-quick-personal"
                                            onClick={() => handleHmrcMarkPersonal(transaction.id)}
                                            type="button"
                                          >
                                            Move to personal
                                          </button>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>

                                <div className="history-right">
                                  <div className="history-amount">{formatCurrency(transaction.amount)}</div>
                                  <div className="button-group history-actions">
                                    <button onClick={() => startEditing(transaction)} className="secondary-button small-button">Edit</button>
                                    <button onClick={() => deleteTransaction(transaction.id)} className="secondary-button small-button">Delete</button>
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

        {showBackToTop && (
          <button className="back-to-top" onClick={scrollToTop}>↑ Top</button>
        )}

        {/* ── HMRC FLAG MODAL ── */}
        {hmrcFlagTransaction && (
          <HMRCFlagModal
            transaction={hmrcFlagTransaction}
            onOverride={handleHmrcOverride}
            onRecategorise={handleHmrcRecategorise}
            onMarkPersonal={handleHmrcMarkPersonal}
            onClose={handleHmrcDismiss}
          />
        )}
{/* GOAL SETUP MODAL */}
{showGoalSetup && (
  <GoalSetupModal
    financialYear={selectedFinancialYear}
    onSave={handleSaveGoal}
    onSkip={handleSkipGoal}
  />
)}

{/* SETTINGS MODAL */}
{showSettings && (
 <SettingsModal
  currentGoal={goalProfit}
  financialYear={selectedFinancialYear}
  onSave={handleSaveGoal}
  onClose={() => setShowSettings(false)}
  onClearData={clearAllTransactions}
/>

)}

      </div>
    </div>
  );
}

export default App;
