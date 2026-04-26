import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate
} from "react-router-dom";
import { auth } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import DashboardApp from "./DashboardApp";
import LoginPage from "./LoginPage";
import SignUpPage from "./SignUpPage";
import LandingPage from "./LandingPage";
import AuthModal from "./AuthModal";
import OnboardingPage from "./OnboardingPage";
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";
import CookiePolicy from "./CookiePolicy";

function AppShell() {
  const [user, setUser] = useState(undefined);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();



useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    setUser(firebaseUser || null);
    setProfileLoading(false);
  });

  return () => unsubscribe();
}, []);

useEffect(() => {
  if (user === undefined || user) {
    setAuthModalOpen(false);
    return;
  }

  if (
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/onboarding"
  ) {
    setAuthModalOpen(true);
  } else {
    setAuthModalOpen(false);
  }
}, [location.pathname, user]);

useEffect(() => {
  const loadUserProfile = async () => {
    if (user === undefined) return;

    if (!user) {
      setOnboardingComplete(false);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setOnboardingComplete(!!userData.onboardingComplete);
      } else {
        setOnboardingComplete(false);
      }
    } catch (error) {
      console.error("Failed to load onboarding status:", error);
      setOnboardingComplete(false);
    } finally {
      setProfileLoading(false);
    }
  };

  loadUserProfile();
}, [user]);

  useEffect(() => {
  if (user === undefined || profileLoading) return;

  if (user && !onboardingComplete && location.pathname !== "/onboarding") {
    navigate("/onboarding");
  }

  if (user && onboardingComplete && location.pathname === "/onboarding") {
    navigate("/");
  }

}, [user, onboardingComplete, profileLoading, location.pathname, navigate]);

 if (user === undefined || profileLoading) {
  return <div style={{ padding: "40px" }}>Loading...</div>;
}

  if (user && onboardingComplete) {
  return <DashboardApp />;
}


  return (
    <>
      <LandingPage onGetStarted={() => navigate("/signup")} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => navigate("/")}
      >
       <Routes>
  <Route path="/" element={<LandingPage onGetStarted={() => navigate("/signup")} />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignUpPage />} />
  <Route path="/onboarding" element={<OnboardingPage />} />
</Routes>
      </AuthModal>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;