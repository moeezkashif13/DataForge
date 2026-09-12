import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building2,
  Mail,
  Lock,
  KeyRound,
  Loader2,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import {
  useGetInvitationQuery,
  useAcceptInvitationMutation,
} from "../../store/api/authApi";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [inputToken, setInputToken] = useState(tokenFromUrl);
  const activeToken = tokenFromUrl || inputToken.trim();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    data: invitation,
    isLoading: isValidating,
    isError: isValidationError,
    error: validationErrorObj,
  } = useGetInvitationQuery(activeToken, {
    skip: !activeToken,
  });

  const [acceptInvitation, { isLoading: isAccepting }] =
    useAcceptInvitationMutation();

  useEffect(() => {
    if (tokenFromUrl) {
      setInputToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!activeToken) {
      setErrorMsg("Invitation token is required.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      const res = await acceptInvitation({
        token: activeToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        email: invitation?.email,
      }).unwrap();

      const orgName =
        res?.organization?.name || invitation?.organizationName || "Workspace";
      showToast(
        "Welcome Aboard!",
        `You have successfully joined ${orgName}.`,
        "success",
      );
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        "Failed to accept invitation. The link may have expired or is invalid.";
      setErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
      showToast(
        "Acceptance Failed",
        typeof msg === "string" ? msg : "Check your invitation details",
        "error",
      );
    }
  };

  // State 1: No token provided at all
  if (!activeToken) {
    return (
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-3">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Invitation Required</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Accept Team Invitation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Please paste the invitation token from your email or invitation link
            below.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = e.target.elements.tokenInput.value.trim();
            if (val) setInputToken(val);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Invitation Token
            </label>
            <input
              name="tokenInput"
              type="text"
              required
              placeholder="e.g. 7f8c9b2e1a3..."
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all font-mono text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <span>Verify Invitation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Already have an active account?{" "}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // State 2: Validating token
  if (isValidating) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Verifying invitation...
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Checking your organization access permissions.
        </p>
      </div>
    );
  }

  // State 3: Token is invalid, expired, or already used
  if (isValidationError || !invitation) {
    const errorDetail =
      validationErrorObj?.data?.message ||
      validationErrorObj?.message ||
      "This invitation is invalid, has expired, or has already been accepted.";

    return (
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-3">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Invalid Invitation</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Invitation Expired or Invalid
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            We could not verify this invitation link.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs space-y-2">
          <p className="font-semibold">Unable to proceed:</p>
          <p className="text-slate-600 dark:text-slate-300">{errorDetail}</p>
        </div>

        <div className="space-y-2">
          <Link
            to="/login"
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <span>Go to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setInputToken("");
              navigate("/accept-invitation", { replace: true });
            }}
            className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Enter a different token
          </button>
        </div>
      </div>
    );
  }

  // State 4: Valid invitation - Render Acceptance Form
  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-3">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Invitation Verified</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Join {invitation.organizationName || "Workspace"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Complete your profile below to accept the invitation and join your
          team.
        </p>
      </div>

      {/* Organization badge callout */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {invitation.organizationName}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Invited as <span className="font-mono">{invitation.email}</span>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Invited Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              disabled
              value={invitation.email || ""}
              className="w-full px-3.5 py-2 pl-9 text-sm rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-mono text-xs cursor-not-allowed"
            />
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              First name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Last name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Choose Password
          </label>
          <div className="relative">
            <input
              type="password"
              required
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 pl-9 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all text-xs"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type="password"
              required
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2 pl-9 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all text-xs"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isAccepting}
          className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
        >
          {isAccepting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Joining Workspace...</span>
            </>
          ) : (
            <>
              <span>Accept &amp; Join Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
