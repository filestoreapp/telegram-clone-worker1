import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/useAuth";

interface AuthPageProps {
  mode?: "login" | "setup";
  onCancel?: () => void;
}

export function AuthPage({ mode: forceMode, onCancel }: AuthPageProps) {
  const { mode: currentAuthMode, source, login, setup, skipSetup } = useAuth();
  const isSetup = forceMode === "setup" || (currentAuthMode === "open" && forceMode !== "login");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSetup) {
      if (!password || password.length < 4) {
        setError("Password must be at least 4 characters long");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      setSubmitting(true);
      const res = await setup(password);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error || "Failed to save password");
      } else if (onCancel) {
        onCancel();
      }
    } else {
      if (!password) {
        setError("Please enter your password");
        return;
      }

      setSubmitting(true);
      const res = await login(password);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error || "Incorrect admin password");
      } else if (onCancel) {
        onCancel();
      }
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card" role="dialog" aria-labelledby="auth-title">
        <div className="auth-header">
          <div className="auth-brand-mark" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </div>
          <h1 id="auth-title" className="auth-title">
            {isSetup ? "Protect Your Console" : "Admin Sign In"}
          </h1>
          <p className="auth-subtitle">
            {isSetup
              ? "Set a master password to restrict access to this Cloudflare Worker, or proceed with open access."
              : "Enter your master password to access the Telegram Clone Worker console."}
          </p>

          {source === "env" && (
            <div className="auth-env-badge" title="Configured in Cloudflare Dashboard or Wrangler">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <span>Enforced via ADMIN_PASSWORD</span>
            </div>
          )}
        </div>

        {error && (
          <div className="auth-error-banner" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="form-label" htmlFor="auth-password">
              {isSetup ? "New Master Password" : "Admin Password"}
            </label>
            <div className="auth-input-wrapper">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                className="input auth-input"
                placeholder={isSetup ? "Enter at least 4 characters" : "Enter password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                disabled={submitting}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {isSetup && (
            <div className="field">
              <label className="form-label" htmlFor="auth-confirm-password">
                Confirm Master Password
              </label>
              <input
                id="auth-confirm-password"
                type={showPassword ? "text" : "password"}
                className="input auth-input"
                placeholder="Re-enter master password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          )}

          <div className="auth-actions">
            <button
              type="submit"
              className="btn btn-primary auth-btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <span>Verifying...</span>
              ) : isSetup ? (
                <span>Save Password & Enter</span>
              ) : (
                <span>Unlock Console</span>
              )}
            </button>

            {isSetup && (
              <button
                type="button"
                className="btn btn-secondary auth-btn-skip"
                onClick={onCancel ? onCancel : skipSetup}
                disabled={submitting}
              >
                {onCancel ? "Cancel" : "Skip for now — Proceed without password"}
              </button>
            )}
          </div>
        </form>

        {isSetup && !onCancel && (
          <p className="auth-footnote">
            Tip: You can always set or change your password later directly in the console navigation or via the Cloudflare Dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
