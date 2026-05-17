import { useState } from "react";
import { TAX_REGIONS } from "../taxEngine";
import "./SettingsModal.css";

function SettingsModal({
  currentGoal,
  financialYear,
  onSave,
  onClose,
  onClearData,
  currentRegion,
  onSaveRegion,
}) {
  const [goalInput, setGoalInput] = useState(
    currentGoal ? String(currentGoal) : ""
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [selectedRegion, setSelectedRegion] = useState(
    currentRegion || "england_wales"
  );
  const [regionSaved, setRegionSaved] = useState(false);

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

  const handleSaveRegion = () => {
    if (onSaveRegion) onSaveRegion(selectedRegion);
    setRegionSaved(true);
    setTimeout(() => setRegionSaved(false), 2000);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">

        {/* ── HEADER — always visible ── */}
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="settings-modal-body">

          {/* ── PROFIT GOAL ── */}
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

          <div className="settings-divider" />

          {/* ── TAX REGION ── */}
          <div className="settings-section">
            <div className="settings-section-header">
              <span className="settings-section-icon">📍</span>
              <div>
                <div className="settings-section-title">
                  Tax region
                </div>
                <div className="settings-section-desc">
                  Your location determines which income tax rates apply.
                  Class 4 National Insurance is the same across all regions.
                </div>
              </div>
            </div>

            <div className="settings-region-options">
              {TAX_REGIONS.map((region) => (
                <button
                  key={region.value}
                  type="button"
                  className={`settings-region-btn ${
                    selectedRegion === region.value
                      ? "settings-region-btn-active"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedRegion(region.value);
                    setRegionSaved(false);
                  }}
                >
                  <span className="settings-region-flag">
                    {region.value === "scotland" ? "🏴󠁧󠁢󠁳󠁣󠁴󠁿" :
                     region.value === "northern_ireland" ? "🇬🇧" : "🏴󠁧󠁢󠁥󠁮󠁧󠁿"}
                  </span>
                  <span className="settings-region-label">{region.label}</span>
                  {selectedRegion === region.value && (
                    <span className="settings-region-check">✓</span>
                  )}
                </button>
              ))}
            </div>

            {selectedRegion === "scotland" && (
              <div className="settings-region-note settings-region-note-scotland">
                <strong>Scottish Income Tax</strong> uses 6 bands (19%–48%),
                administered jointly by Revenue Scotland and HMRC. Your tax
                calculation and financial insights will use Scottish rates.
              </div>
            )}

            {selectedRegion === "northern_ireland" && (
              <div className="settings-region-note">
                Northern Ireland follows <strong>Westminster income tax rates</strong>,
                set by HMRC — the same as England and Wales.
              </div>
            )}

            <button
              className="primary-button settings-save-btn"
              onClick={handleSaveRegion}
            >
              {regionSaved ? "✓ Region saved" : "Save region"}
            </button>
          </div>

          <div className="settings-divider" />

          {/* ── DANGER ZONE ── */}
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

          {/* ── INFO ── */}
          <div className="settings-info">
            <p>
              Your goal and tax region are stored securely and sync across
              all your devices. Enyi uses them to personalise your tax
              calculations and financial coaching.
            </p>
          </div>

        </div>
        {/* end settings-modal-body */}

      </div>
    </div>
  );
}

export default SettingsModal;
