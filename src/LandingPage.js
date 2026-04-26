import logoIcon from "./assets/enyi-icon.png";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";


function LandingPage({ onGetStarted }) {
    const navigate = useNavigate();
  return (
    <div className="app-shell landing-page">
      <section className="landing-hero">
        <div className="landing-copy">
          <header className="brand-header">
          <div className="brand-lockup">
            <div className="brand-icon-tile">
              <img src={logoIcon} alt="Enyi icon" className="brand-icon" />
            </div>

            <div className="brand-text">
              <h1 className="brand-name">Enyi</h1>
              <p className="brand-tagline">
                Bookkeeping and tax. Sorted by AI.
              </p>
            </div>
          </div>
        </header>

          <h1>Business finance clarity for sole traders and businesses.</h1>

          <p className="landing-subtitle">
            Enyi helps you track income, monitor expenses, estimate tax, and
            get practical AI guidance on what matters most in your business.
          </p>

          <div className="landing-actions">
            <button className="landing-primary-button" onClick={onGetStarted}>
              Get started
            </button>

        <button
  className="landing-secondary-button"
  onClick={() => navigate("/login")}
>
  Sign in
</button>
          </div>

          <div className="landing-points">
  <div className="landing-point">Built for sole traders and small businesses</div>
  <div className="landing-point">Stay organised without the stress</div>
  <div className="landing-point">Spend less time on admin, more on your business</div>
</div>
        </div>

        <div className="landing-preview-card">
  <div className="landing-preview-label">
    What Enyi helps you do
  </div>

  <div className="landing-preview-item">
    <strong>See where your money is going</strong>
    <p>Spot your biggest cost categories and take action faster.</p>
  </div>

  <div className="landing-preview-item">
    <strong>Stay ahead of tax</strong>
    <p>Estimate what to set aside so tax doesn’t surprise you later.</p>
  </div>

  <div className="landing-preview-item">
    <strong>Stay compliant with HMRC</strong>
    <p>Be ready for Making Tax Digital with quarterly submissions</p>
  </div>

  <div className="landing-preview-item">
    <strong>Make better business decisions</strong>
    <p>Turn your records into useful financial guidance.</p>
  </div>
</div>
      </section>
    </div>
  );
}

export default LandingPage;