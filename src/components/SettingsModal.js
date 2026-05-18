import { useState } from "react";
import { TAX_REGIONS } from "../taxEngine";
import "./SettingsModal.css";

const OTHER_INCOME_TYPES = [
  {
    value: "employment",
    label: "Employment (PAYE)",
    icon: "💼",
    desc: "Salary or wages from an employer, taxed at source",
    placeholder: "e.g. 28000",
  },
  {
    value: "rental",
    label: "Rental income",
    icon: "🏠",
    desc: "Income from letting property. First £1,000 is tax-free",
    placeholder: "e.g. 12000",
  },
  {
    value: "savings",
    label: "Savings interest",
    icon: "🏦",
    desc: "Basic rate taxpayers get £1,000 tax-free, higher rate £500",
    placeholder: "e.g. 1500",
  },
  {
    value: "dividends",
    label: "Dividends",
    icon: "📈",
    desc: "From shares or investments. First £500 is tax-free",
    placeholder: "e.g. 5000",
  },
  {
    value: "pension",
    label: "Pension income",
    icon: "🧓",
    desc: "Private, workplace or State Pension",
    placeholder: "e.g. 9000",
  },
  {
    value: "foreign",
    label: "Foreign income",
    icon: "🌍",
    desc: "Income earned abroad, declared to HMRC",
    placeholder: "e.g. 3000",
  },
];

function SettingsDrawer({ icon, title, subtitle, value, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="settings-drawer">
      <button
        className="settings-drawer-header"
        onClick={() => setOpen(prev => !prev)}
        type="button"
      >
        <div className="settings-drawer-left">
          <div className="settings-drawer-icon">{icon}</div>
          <div>
            <div className="settings-drawer-title">{title}</div>
            <div className="settings-drawer-sub">{subtitle}</div>
          </div>
        </div>
        <div className="settings-drawer-right">
          {value && <span className="settings-drawer-value">{value}</span>}
          <span className={`settings-drawer-chevron ${open ? "open" : ""}`}>▾</span>
        </div>
      </button>

      {open && (
        <div className="settings-drawer-body">
          {children}
        </div>
      )}
    </div>
  );
}

function OtherIncomeSection({ otherIncomeSources, onUpdate }) {
  const [amounts, setAmounts] = useState(() => {
    const map = {};
    (otherIncomeSources || []).forEach(s => { map[s.type] = String(s.amount); });
    return map;
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (type, value) => {
    setAmounts(prev => ({ ...prev, [type]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    const sources = Object.entries(amounts)
      .filter(([, val]) => val && parseFloat(val) > 0)
      .map(([type, val]) => ({ type, amount: parseFloat(val) }));
    onUpdate(sources);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const total = Object.values(amounts)
    .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  return (
    <div className="other-income-section">
      <div className="other-income-list">
        {OTHER_INCOME_TYPES.map(item => (
          <div key={item.value} className="other-income-item">
            <div className="other-income-item-left">
              <span className="other-income-item-icon">{item.icon}</span>
              <div className="other-income-item-text">
                <div className="other-income-item-label">{item.label}</div>
                <div className="other-income-item-desc">{item.desc}</div>
              </div>
            </div>
            <div className="other-income-item-input-wrap">
              <span className="other-income-item-currency">£</span>
              <input
                className="other-income-item-input"
                type="number"
                placeholder={item.placeholder.replace("e.g. ", "")}
                value={amounts[item.value] || ""}
                onChange={e => handleChange(item.value, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="other-income-total-row">
          <span className="other-income-total-label">Total other income</span>
          <span className="other-income-total-value">
            £{total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="other-income-note">
        Used to estimate your total tax liability only. Not submitted to HMRC.
      </div>

      <button
        className="primary-button settings-save-btn"
        onClick={handleSave}
        type="button"
      >
        {saved ? "✓ Saved" : "Save other income"}
      </button>
    </div>
  );
}

function SettingsModal({
  currentGoal,
  financialYear,
  onSave,
  onClose,
  onClearData,
  currentRegion,
  onSaveRegion,
  otherIncomeSources,
  onSaveOtherIncome,
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

  const otherTotal = (otherIncomeSources || [])
    .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  return (
    <div className="settings-overlay">
      <div className="settings-modal">

        {/* ── HEADER ── */}
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="settings-modal-body">

          {/* ── PROFIT GOAL DRAWER ── */}
          <SettingsDrawer
            icon="🎯"
            title={`Profit goal for ${financialYear}`}
            subtitle="Set your annual target"
            defaultOpen={true}
          >
            <div className="settings-section-desc" style={{ marginBottom: 12 }}>
              Update your target if your circumstances have changed.
              Think carefully — a consistent goal keeps you focused.
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
          </SettingsDrawer>

          {/* ── OTHER INCOME DRAWER ── */}
          <SettingsDrawer
            icon="💰"
            title="Other income sources"
            subtitle="Salary, rental, dividends & more"
            value={otherTotal > 0
              ? `£${otherTotal.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`
              : null}
          >
            <div className="settings-section-desc" style={{ marginBottom: 12 }}>
              Add any income outside your self-employment to improve your tax estimate.
            </div>
            <OtherIncomeSection
              otherIncomeSources={otherIncomeSources || []}
              onUpdate={onSaveOtherIncome}
            />
          </SettingsDrawer>

          {/* ── TAX REGION DRAWER ── */}
          <SettingsDrawer
            icon="📍"
            title="Tax region"
            subtitle="Determines your income tax rates"
            value={TAX_REGIONS.find(r => r.value === selectedRegion)?.label}
          >
            <div className="settings-section-desc" style={{ marginBottom: 12 }}>
              Your location determines which income tax rates apply.
              Class 4 National Insurance is the same across all regions.
            </div>
            <div className="settings-region-options">
              {TAX_REGIONS.map((region) => (
                <button
                  key={region.value}
                  type="button"
                  className={`settings-region-btn ${
                    selectedRegion === region.value ? "settings-region-btn-active" : ""
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
                administered by Revenue Scotland and HMRC.
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
          </SettingsDrawer>

          {/* ── DANGER ZONE DRAWER ── */}
          <SettingsDrawer
            icon="⚠️"
            title="Danger Zone"
            subtitle="Delete all transaction data"
          >
            <div className="settings-section-desc" style={{ marginBottom: 12 }}>
              Permanently delete all your transactions. This cannot be undone.
              Download your CSV first if you need a backup.
            </div>
            <button
              className="settings-danger-btn"
              onClick={() => { onClose(); onClearData(); }}
              type="button"
            >
              Clear all transaction data
            </button>
          </SettingsDrawer>

          {/* ── INFO ── */}
          <div className="settings-info">
            <p>
              Your settings are stored securely and sync across all your devices.
              Enyi uses them to personalise your tax calculations and financial coaching.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

export default SettingsModal;
