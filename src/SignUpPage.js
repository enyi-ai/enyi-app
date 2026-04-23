
import logoIcon from "./assets/enyi-icon.png";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import "./Auth.css";


function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setStatusMessage("");

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/onboarding");
    } catch (error) {
      setStatusMessage(error.message || "Could not create account.");
    }
  };

  const handleGoogleSignUp = async () => {
    setStatusMessage("");

    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/onboarding");
    } catch (error) {
      setStatusMessage(error.message || "Google sign-up failed.");
    }
  };

return (
  <div className="auth-panel">
    <div className="brand-header auth-brand-header">
  <div className="brand-lockup">
    <div className="brand-icon-title">
      <img src={logoIcon} alt="Enyi icon" className="brand-icon" />
    </div>

    <div className="brand-text">
      <h1 className="brand-name">Enyi</h1>
    </div>
  </div>
</div>

    <h1>Create account</h1>
    <p className="auth-subtitle">
      Get started with Enyi and keep your business finances organised.
    </p>

    <form onSubmit={handleSignUp} className="auth-form">
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="auth-input"
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="auth-input"
        required
      />

      <button type="submit" className="auth-button">
        Create account
      </button>
    </form>

    <div className="auth-divider">or</div>

    <button onClick={handleGoogleSignUp} className="auth-button-secondary">
      Continue with Google
    </button>

    {statusMessage && <p className="auth-status">{statusMessage}</p>}

    <p className="auth-footer">
      Already have an account? <Link to="/login">Sign in</Link>
    </p>
  </div>
);
}

export default SignUpPage;