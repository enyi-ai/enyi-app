import { useState } from "react";
import "./Auth.css";
import logoIcon from "./assets/enyi-icon.png";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

function OnboardingPage() {
  const [fullName, setFullName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [businessType, setBusinessType] = useState("Sole trader");


  const handleSubmit = async (e) => {
  e.preventDefault();

  // Trim inputs to avoid spaces
  const name = fullName.trim();
  const job = occupation.trim();

  // VALIDATION
  if (!name || name.length < 4) {
    alert("Please enter your full name");
    return;
  }

  if (!job || job.length < 4) {
    alert("Please enter your occupation");
    return;
  }

  const data = {
    fullName: name,
    occupation: job,
    country,
    businessType,
    onboardingComplete: true,
    createdAt: serverTimestamp(),
  };

  const currentUser = auth.currentUser;

  if (!currentUser) {
    alert("No authenticated user found");
    return;
  }

  try {
    await setDoc(
      doc(db, "users", currentUser.uid),
      data,
      { merge: true }
    );

  } catch (error) {
    console.error("Failed to save onboarding:", error);
    alert("Could not save your details. Please try again.");
  }
};

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-card">
        <div className="auth-card">

          {/* BRAND */}
          <div className="auth-brand-header">
            <div className="brand-lockup">
              <img src={logoIcon} alt="Enyi" className="brand-icon" />
              <span className="brand-name">Enyi</span>
            </div>
          </div>

          {/* TITLE */}
          <h1 className="auth-title">Tell us about you</h1>
          <p className="auth-subtitle">
            Help us personalise Enyi for your business.
          </p>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="auth-form">

            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="auth-input"
              required
            />

            <input
              type="text"
              placeholder="Occupation"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="auth-input"
              required
            />

            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="auth-input"
            >
              <option>United Kingdom</option>
              <option>Nigeria</option>
              <option>United States</option>
              <option>Canada</option>
            </select>

            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="auth-input"
            >
              <option>Sole trader</option>
              <option>Limited company</option>
              <option>Partnership</option>
              <option>Not sure</option>
            </select>

            <button type="submit" className="auth-button">
              Continue to Enyi
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;