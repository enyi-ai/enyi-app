import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import "./Auth.css";
import logoIcon from "./assets/enyi-icon.png";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatusMessage("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error) {
      setStatusMessage(error.message || "Could not log in.");
    }
  };

  const handleGoogleLogin = async () => {
    setStatusMessage("");

    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (error) {
      setStatusMessage(error.message || "Google sign-in failed.");
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

    <h1>Welcome Back</h1>

    <p className="auth-subtitle">
      Sign in to access your finance workspace.
    </p>

    <form onSubmit={handleLogin} className="auth-form">
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
        Sign in
      </button>
    </form>

    <div className="auth-divider">or</div>

    <button onClick={handleGoogleLogin} className="auth-button-secondary">
      Continue with Google
    </button>

    {statusMessage && <p className="auth-status">{statusMessage}</p>}

    <p className="auth-footer">
      Don’t have an account? <Link to="/signup">Create one</Link>
    </p>
  </div>
);
}

export default LoginPage;