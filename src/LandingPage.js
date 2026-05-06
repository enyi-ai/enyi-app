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
                  Your AI finance partner
                </p>
              </div>
            </div>
          </header>

          <div className="landing-eyebrow">

          </div>

          <h1>Run your business with financial intelligence.</h1>

          <p className="landing-subtitle">
            Enyi helps UK businesses track income, manage expenses, stay tax
            aware, and make better financial decisions with AI-powered guidance.
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
            <div className="landing-point">Bookkeeping and receipts in one place</div>
            <div className="landing-point">Tax-aware guidance for UK businesses</div>
            <div className="landing-point">Built to become your AI finance coach</div>
          </div>
        </div>

        <div className="landing-preview-card">
          <div className="landing-preview-label">
            Your financial command centre
          </div>

          <div className="landing-preview-item">
            <strong>Understand your numbers</strong>
            <p>See income, expenses, profit and spending patterns clearly.</p>
          </div>

          <div className="landing-preview-item">
            <strong>Stay tax aware</strong>
            <p>Estimate what to set aside and prepare for HMRC with confidence.</p>
          </div>

          <div className="landing-preview-item">
            <strong>Make better decisions</strong>
            <p>Use your records to guide pricing, spending and planning.</p>
          </div>

          <div className="landing-preview-item">
            <strong>Built for the future</strong>
            <p>Enyi is growing into a personalised AI finance adviser for SMEs.</p>
          </div>
        </div>
      </section>

      <section className="vision-strip">
        <p>
          Enyi is building towards personalised financial intelligence for every
          UK small business — helping owners stay compliant, plan ahead and grow
          with confidence.
        </p>
      </section>

      <footer className="landing-footer">
        <a href="/privacy">Privacy Policy</a>
        <span>•</span>
        <a href="/terms">Terms</a>
        <span>•</span>
        <a href="/cookies">Cookies</a>
        <span>•</span>
        <a href="mailto:support@enyi.ai">Contact</a>

        <p>Copyright© 2026 Enyi</p>
      </footer>
    </div>
  );
}

export default LandingPage;