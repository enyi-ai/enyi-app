import { useState } from "react";
import { HMRC_CATEGORIES, getCategoryAllowability } from "../hmrcRules";
import "./HMRCFlagModal.css";

function HMRCFlagModal({ transaction, onOverride, onRecategorise, onMarkPersonal, onClose }) {
  const [showRecategorise, setShowRecategorise] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");

  const allowability = getCategoryAllowability(transaction.category);
  const status = transaction.hmrcStatus;

  // Determine current state for context
  const isBusiness = status === "overridden" || (allowability === "always" && !status);
  const isPersonal = status === "personal" || transaction.category === "Personal" || (allowability === "never" && !status);
  const isUnclaimed = !isBusiness && !isPersonal;

  const handleMarkBusiness = () => {
    onOverride(transaction.id, "Confirmed as business expense by user");
  };

  const handleMarkPersonal = () => {
    onMarkPersonal(transaction.id);
  };

  const handleMarkUnclaimed = async () => {
    // Reset hmrcStatus to null so it returns to Unclaimed
    onClose();
    // We call onRecategorise with same category to trigger a status reset
    onRecategorise(transaction.id, transaction.category);
  };

  const handleRecategoriseSubmit = () => {
    if (!newCategory) {
      setError("Please select a category.");
      return;
    }
    onRecategorise(transaction.id, newCategory);
  };

  const allowableCategories = HMRC_CATEGORIES.filter(
    c => c.allowability === "always" || c.allowability === "conditional"
  );

  return (
    <div className="hmrc-modal-overlay" onClick={onClose}>
      <div className="hmrc-modal review-modal" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="review-modal-header">
          <div className="review-modal-icon">
            {isBusiness ? "✅" : isPersonal ? "👤" : "⚡"}
          </div>
          <div>
            <div className="review-modal-title">{transaction.text}</div>
            <div className="review-modal-meta">
   £{Number(transaction.amount).toFixed(2)} · {transaction.category}

            </div>
          </div>
          <button className="review-modal-close" onClick={onClose} type="button">✕</button>
        </div>

        {/* CONTEXT NOTE */}
        {isUnclaimed && (
          <div className="review-modal-note">
            💡 Enyi wasn't sure about this one. Tell us how to classify it and we'll remember for next time.
          </div>
        )}
        {isBusiness && (
          <div className="review-modal-note review-modal-note-green">
            ✅ Currently classified as a business expense. Move it if this is wrong.
          </div>
        )}
        {isPersonal && (
          <div className="review-modal-note review-modal-note-red">
            👤 Currently classified as personal. Move it if this is wrong.
          </div>
        )}

        {!showRecategorise ? (
          <div className="review-modal-options">

            {/* YES — BUSINESS */}
            {!isBusiness && (
              <button
                className="review-option review-option-business"
                onClick={handleMarkBusiness}
                type="button"
              >
                <span className="review-option-icon">✅</span>
                <div>
                  <div className="review-option-label">Yes — it's a business expense</div>
                  <div className="review-option-sub">Moves to Business, reduces your tax bill</div>
                </div>
              </button>
            )}

            {/* NO — PERSONAL */}
            {!isPersonal && (
              <button
                className="review-option review-option-personal"
                onClick={handleMarkPersonal}
                type="button"
              >
                <span className="review-option-icon">👤</span>
                <div>
                  <div className="review-option-label">No — it's personal</div>
                  <div className="review-option-sub">Moves to Personal, excluded from tax</div>
                </div>
              </button>
            )}

            {/* RECATEGORISE */}
            <button
              className="review-option review-option-recategorise"
              onClick={() => setShowRecategorise(true)}
              type="button"
            >
              <span className="review-option-icon">🔄</span>
              <div>
                <div className="review-option-label">Wrong category — fix it</div>
                <div className="review-option-sub">Change to a different expense type</div>
              </div>
            </button>

            {/* NOT SURE — UNCLAIMED */}
            {!isUnclaimed && (
              <button
                className="review-option review-option-unclaimed"
                onClick={handleMarkUnclaimed}
                type="button"
              >
                <span className="review-option-icon">⏳</span>
                <div>
                  <div className="review-option-label">Not sure — review later</div>
                  <div className="review-option-sub">Moves back to Unclaimed until you decide</div>
                </div>
              </button>
            )}

            {/* DISMISS — only for unclaimed */}
            {isUnclaimed && (
              <button className="review-modal-dismiss" onClick={onClose} type="button">
                Dismiss for now
              </button>
            )}

          </div>
        ) : (
          <div className="review-recategorise">
            <div className="review-recategorise-label">Select the correct category</div>
            <select
              className="fin-input"
              value={newCategory}
              onChange={e => { setNewCategory(e.target.value); setError(""); }}
            >
              <option value="">Choose category...</option>
              {allowableCategories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            {error && <p className="hmrc-error">{error}</p>}
            <div className="button-group" style={{ marginTop: 12 }}>
              <button className="primary-button" onClick={handleRecategoriseSubmit} type="button">
                Save category
              </button>
              <button className="secondary-button" onClick={() => { setShowRecategorise(false); setError(""); }} type="button">
                Back
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default HMRCFlagModal;
