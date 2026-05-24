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
                  Your smartest business partner
                </p>
              </div>
            </div>
          </header>

          <div className="landing-eyebrow">

          </div>

          <h1>Run your business with financial intelligence.</h1>

          <p className="landing-subtitle">
            Enyi learns from your business finances to deliver personalised AI guidance — helping UK SMEs understand performance, anticipate tax obligations, and make smarter decisions with confidence..
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
            <div className="landing-point">AI financial intelligence built around your business </div>
            <div className="landing-point">Proactive UK tax and compliance</div>
            <div className="landing-point">Personalised coaching that gets smarter as your business grows</div>
          </div>
        </div>

        <div className="landing-preview-card">
          <div className="landing-preview-label">
            What Enyi Does
          </div>

          <div className="landing-preview-item">
            <strong>Knows your financial position in real time</strong>
            <p>See income, expenses, profit and spending patterns clearly.</p>
          </div>

          <div className="landing-preview-item">
            <strong>Warns you before HMRC becomes a problem</strong>
            <p>Estimate what to set aside and prepare for HMRC with confidence.</p>
          </div>

          <div className="landing-preview-item">
            <strong>Advises on pricing, spending and growth</strong>
            <p>Use your records to guide pricing, spending and planning.</p>
          </div>

          <div className="landing-preview-item">
            <strong>Gets smarter the longer you use it</strong>
            <p>The more you use Enyi, the more precisely it understands your business.</p>
          </div>
        </div>
      </section>

      <section className="vision-strip">
        <p>
          Enyi is your AI CFO — the financial brain every small business deserves but could never afford.
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