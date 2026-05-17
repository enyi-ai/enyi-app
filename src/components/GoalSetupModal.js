import { useState } from "react";
import "./GoalSetupModal.css";

function GoalSetupModal({ financialYear, onSave, onSkip }) {
  const [goalInput, setGoalInput] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    const parsed = parseFloat(goalInput.replace(/,/g, ""));
    if (!parsed || parsed <= 0) {
      setError("Please enter a valid profit goal.");
      return;
    }
    onSave(parsed);
  };

  return (
    <div className="goal-modal-overlay">
      <div className="goal-modal">

        <div className="goal-modal-icon">🎯</div>

        <h2 className="goal-modal-title">
          Set your profit goal for {financialYear}
        </h2>

        <p className="goal-modal-desc">
          How much profit do you want your business to make this tax year?
          Enyi will track your progress and coach you along the way.
        </p>

        <div className="goal-modal-input-wrap">
          <span className="goal-modal-currency">£</span>
          <input
            className="goal-modal-input"
            type="number"
            placeholder="e.g. 50000"
            value={goalInput}
            onChange={(e) => {
              setGoalInput(e.target.value);
              setError("");
            }}
            autoFocus
          />
        </div>

        {error && <p className="goal-modal-error">{error}</p>}

        <div className="goal-modal-actions">
          <button className="primary-button" onClick={handleSave}>
            Set my goal
          </button>
          <button className="goal-modal-skip" onClick={onSkip}>
            Skip for now
          </button>
        </div>

        <p className="goal-modal-note">
          You can update your goal anytime in Settings.
        </p>

      </div>
    </div>
  );
}

export default GoalSetupModal;
