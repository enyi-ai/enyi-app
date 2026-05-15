import { useState } from "react";
import { HMRC_CATEGORIES, ALLOWABILITY_CONFIG, getCategoryAllowability } from "../hmrcRules";

function HMRCFlagModal({ transaction, onOverride, onRecategorise, onMarkPersonal, onClose }) {
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideInput, setShowOverrideInput] = useState(
    transaction.quickMode === "confirm"
  );
  const [showRecategorise, setShowRecategorise] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");

  const allowability = getCategoryAllowability(transaction.category);
  const config = ALLOWABILITY_CONFIG[allowability] || ALLOWABILITY_CONFIG.conditional;

  const handleOverrideSubmit = () => {
    if (!overrideReason.trim()) {
      setError("Please explain why this expense is allowable.");
      return;
    }
    onOverride(transaction.id, overrideReason.trim());
  };

  const handleRecategoriseSubmit = () => {
    if (!newCategory) {
      setError("Please select a new category.");
      return;
    }
    onRecategorise(transaction.id, newCategory);
  };

  const allowableCategories = HMRC_CATEGORIES.filter(
    c => c.allowability === "always" || c.allowability === "conditional"
  );

  return (
    <div className="hmrc-modal-overlay">
      <div className="hmrc-modal">

        {/* Header */}
        <div
          className="hmrc-modal-header"
          style={{ borderLeftColor: config.border || "#ef4444" }}
        >
          <div className="hmrc-modal-badge" style={{ color: config.color }}>
            {transaction.quickMode === "confirm"
              ? "✅ Confirm as HMRC Allowable"
              : allowability === "never"
              ? "🚨 Not Tax Deductible"
              : "⚠️ Conditional Allowance"}
          </div>
          <h3 className="hmrc-modal-title">
            {transaction.quickMode === "confirm"
              ? "Add to Allowable Expenses"
              : "HMRC Expense Review"}
          </h3>
          <p className="hmrc-modal-transaction">
            {transaction.text} —{" "}
            <strong>£{Number(transaction.amount).toFixed(2)}</strong>{" "}
            ({transaction.category})
          </p>
        </div>

        {/* HMRC Note — hide in quick confirm mode */}
        {!transaction.quickMode && (
          <div
            className="hmrc-modal-note"
            style={{
              background: config.background,
              borderColor: config.border
            }}
          >
            <p>{config.message ? config.message(transaction.category) : ""}</p>
          </div>
        )}

        {/* Quick confirm mode — straight to override input */}
        {transaction.quickMode === "confirm" && !showRecategorise && (
          <div className="hmrc-override-block">
            <p className="hmrc-quick-intro">
              Confirm that <strong>{transaction.text}</strong> is a legitimate
              business expense and explain why it qualifies under HMRC rules.
              This will be added to your allowable expenses and included in your
              tax calculation.
            </p>
            <label className="hmrc-override-label">
              Why is this expense HMRC allowable for your business?
            </label>
            <textarea
              className="hmrc-override-textarea"
              placeholder="e.g. Business meal with client to discuss Q3 contract renewal..."
              value={overrideReason}
              onChange={(e) => {
                setOverrideReason(e.target.value);
                setError("");
              }}
              rows={3}
            />
            {error && <p className="hmrc-error">{error}</p>}
            <div className="hmrc-override-buttons">
              <button className="primary-button" onClick={handleOverrideSubmit}>
                Confirm — add to allowable
              </button>
              <button className="secondary-button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Standard mode actions */}
        {!transaction.quickMode && !showOverrideInput && !showRecategorise && (
          <div className="hmrc-modal-actions">
            <button
              className="hmrc-action-button hmrc-action-allowable"
              onClick={() => setShowOverrideInput(true)}
              type="button"
            >
              ✅ Add to allowable expenses
              <span>Confirm this qualifies and add a note</span>
            </button>

            <button
              className="hmrc-action-button hmrc-action-recategorise"
              onClick={() => setShowRecategorise(true)}
              type="button"
            >
              Recategorise
              <span>Move to a different HMRC category</span>
            </button>

            <button
              className="hmrc-action-button hmrc-action-personal"
              onClick={() => onMarkPersonal(transaction.id)}
              type="button"
            >
              Move to personal
              <span>Remove from tax calculation entirely</span>
            </button>
          </div>
        )}

        {/* Standard override input */}
        {!transaction.quickMode && showOverrideInput && (
          <div className="hmrc-override-block">
            <label className="hmrc-override-label">
              Why is this expense allowable for your business?
            </label>
            <textarea
              className="hmrc-override-textarea"
              placeholder="e.g. This was a business meal with a client to discuss a contract..."
              value={overrideReason}
              onChange={(e) => {
                setOverrideReason(e.target.value);
                setError("");
              }}
              rows={3}
            />
            {error && <p className="hmrc-error">{error}</p>}
            <div className="hmrc-override-buttons">
              <button className="primary-button" onClick={handleOverrideSubmit}>
                Confirm — add to allowable
              </button>
              <button
                className="secondary-button"
                onClick={() => { setShowOverrideInput(false); setError(""); }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Recategorise */}
        {showRecategorise && (
          <div className="hmrc-override-block">
            <label className="hmrc-override-label">
              Select the correct HMRC category
            </label>
            <select
              className="fin-input"
              value={newCategory}
              onChange={(e) => { setNewCategory(e.target.value); setError(""); }}
            >
              <option value="">Choose category...</option>
              {allowableCategories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {error && <p className="hmrc-error">{error}</p>}
            <div className="hmrc-override-buttons">
              <button className="primary-button" onClick={handleRecategoriseSubmit}>
                Save new category
              </button>
              <button
                className="secondary-button"
                onClick={() => { setShowRecategorise(false); setError(""); }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Dismiss — only in standard mode */}
        {!transaction.quickMode && !showOverrideInput && !showRecategorise && (
          <button className="hmrc-dismiss" onClick={onClose}>
            Dismiss for now
          </button>
        )}

      </div>
    </div>
  );
}

export default HMRCFlagModal;
