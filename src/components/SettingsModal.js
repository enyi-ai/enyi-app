import { useState } from "react";
import "./SettingsModal.css";

function SettingsModal({ currentGoal, financialYear, onSave, onClose, onClearData }) {
  const [goalInput, setGoalInput] = useState(
    currentGoal ? String(currentGoal) : ""
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const parsed = parseFloat(goalInput.replace(/,/g, ""));
    if (!parsed || parsed <= 0) {
      setError("Please enter a valid profit goal.");
      return;
    }
    onSave(parsed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">

        {/* Header */}
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* Goal section */}
        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-section-icon">🎯</span>
            <div>
              <div className="settings-section-title">
                Profit goal for {financialYear}
              </div>
              <div className="settings-section-desc">
                Update your target if your circumstances have changed.
                Think carefully — a consistent goal keeps you focused.
              </div>
            </div>
          </div>

          <div className="settings-input-wrap">
            <span className="settings-currency">£</span>
            <input
              className="settings-input"
              type="number"
              placeholder="e.g. 50000"
              value={goalInput}
              onChange={(e) => {
                setGoalInput(e.target.value);
                setError("");
                setSaved(false);
              }}
            />
          </div>

          {error && <p className="settings-error">{error}</p>}

          <button
            className="primary-button settings-save-btn"
            onClick={handleSave}
          >
            {saved ? "✓ Saved" : "Update goal"}
          </button>
        </div>

        {/* Divider */}
        <div className="settings-divider" />

        {/* Danger zone */}
<div className="settings-divider" />

<div className="settings-section">
  <div className="settings-section-header">
    <span className="settings-section-icon">⚠️</span>
    <div>
      <div className="settings-section-title" style={{ color: "#b91c1c" }}>
        Danger Zone
      </div>
      <div className="settings-section-desc">
        Permanently delete all your transactions. This cannot be undone.
        Download your CSV first if you need a backup.
      </div>
    </div>
  </div>

  <button
  className="settings-danger-btn"
  onClick={() => {
    onClose();
    onClearData();
  }}
  type="button"
>
  Clear all transaction data
</button>

</div>


        {/* Info section */}
        <div className="settings-info">
          <p>
            Your goal is stored securely and syncs across all your devices.
            Enyi uses it to track your progress and coach you toward your target.
          </p>
        </div>

      </div>
    </div>
  );
}

export default SettingsModal;
