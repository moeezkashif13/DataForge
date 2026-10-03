import { useEffect } from "react";
import { Navigate, useLocation, Link } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import {
  selectIsAuthenticated,
  selectIsAuthInitialized,
  selectOrganizationId,
  setCredentials,
  selectCurrentUser,
} from "../../store/slices/authSlice";
import { useGetMyOrganizationsQuery } from "../../store/api/organizationApi";
import { useLogoutMutation } from "../../store/api/authApi";
import { Building2, LogOut, Plus, ShieldAlert, Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isInitialized = useSelector(selectIsAuthInitialized);
  const currentOrgId = useSelector(selectOrganizationId);
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const location = useLocation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const {
    data: organizations = [],
    isLoading: isOrgsLoading,
    isFetching: isOrgsFetching,
  } = useGetMyOrganizationsQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Automatically ensure currentOrgId points to a valid organization the user actually belongs to
  useEffect(() => {
    if (!isAuthenticated || isOrgsLoading || organizations.length === 0) return;

    const isValidCurrentOrg = organizations.some((o) => o.id === currentOrgId);
    if (!currentOrgId || !isValidCurrentOrg) {
      dispatch(setCredentials({ organizationId: organizations[0].id }));
    }
  }, [isAuthenticated, isOrgsLoading, organizations, currentOrgId, dispatch]);

  if (!isInitialized && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isOrgsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono">
            Verifying organization membership...
          </p>
        </div>
      </div>
    );
  }

  // If the user belongs to zero organizations, prevent access to app shell
  if (organizations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              No Organization Found
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Your account (
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {currentUser?.email}
              </span>
              ) is not currently an active member of any organization. You may have been removed or need to create a new organization.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create an Organization</span>
            </Link>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => logout()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
