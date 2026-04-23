import "./AuthModal.css";

function AuthModal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export default AuthModal;