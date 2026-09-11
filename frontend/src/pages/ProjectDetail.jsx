import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  Folder,
  ArrowRightLeft,
  Users,
  Settings,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { useGetProjectByIdQuery } from "../store/api/projectsApi";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { useToast } from "../context/ToastContext";

// Page-level dummy users fallback formatted with "Value (Dummy)"
const DUMMY_PROJECT_USERS = [
  {
    id: "usr-1 (Dummy)",
    name: "Sarah Connor (Dummy)",
    email: "sarah.connor@dataforge.io (Dummy)",
    role: "creator (Dummy)",
    joinedAt: "2 days ago (Dummy)",
  },
  {
    id: "usr-2 (Dummy)",
    name: "Alex Rivera (Dummy)",
    email: "alex.rivera@dataforge.io (Dummy)",
    role: "member (Dummy)",
    joinedAt: "1 week ago (Dummy)",
  },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { data: apiProject, isLoading } = useGetProjectByIdQuery(projectId, {
    skip: !projectId,
  });

  const [activeTab, setActiveTab] = useState("Overview");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Dynamic project model with "Value (Dummy)" fallbacks for any missing attributes
  const project = {
    id: apiProject?.id || projectId || "proj-dummy (Dummy)",
    name: apiProject?.name || "Customer Platform (Dummy)",
    environment: apiProject?.environment || "Production (Dummy)",
    description:
      apiProject?.description ||
      "Custom data migration group and synchronization pipeline (Dummy)",
    status: apiProject?.status || "ACTIVE (Dummy)",
  };

  // Dynamic migrations from backend (empty if none are made for this project)
  const projectMigrations =
    Array.isArray(apiProject?.migrations) && apiProject.migrations.length > 0
      ? apiProject.migrations.map((m) => {
          const sourceLabel = m.source_path || "production.customers (Dummy)";
          const targetLabel = m.target_path || "analytics.customers_v2 (Dummy)";
          return {
            id: m.id || "mig-unknown (Dummy)",
            name: m.name || "Untitled Migration (Dummy)",
            status: m.status || "RUNNING (Dummy)",
            sourceTargetLabel:
              m.sourceTargetLabel ||
              (m.source_path && m.target_path
                ? `${m.source_path} → ${m.target_path}`
                : `${sourceLabel} → ${targetLabel}`),
            progress: typeof m.progress === "number" ? m.progress : 0,
          };
        })
      : [];

  // Dynamic users associated within this project
  const projectUsers = Array.isArray(apiProject?.users)
    ? apiProject?.users.map((u) => ({
        id: u.id || u.userId || "usr-unknown (Dummy)",
        name: u.name || "Team Member (Dummy)",
        email: u.email || "member@example.com (Dummy)",
        role: u.role || "member (Dummy)",
        joinedAt: u.joinedAt || "Recently (Dummy)",
      }))
    : apiProject
      ? []
      : DUMMY_PROJECT_USERS;

  const tabs = [
    { name: "Overview", icon: Folder },
    {
      name: "Migrations",
      icon: ArrowRightLeft,
      count: projectMigrations.length,
    },
    {
      name: "Users",
      icon: Users,
      count: projectUsers.length,
    },
    { name: "Settings", icon: Settings },
  ];

  const handleDeleteProject = () => {
    showToast(
      "Project Archived",
      `Project "${project.name}" has been marked archived.`,
      "warning",
    );
    navigate("/projects");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 mt-3 font-medium">
          Loading project details...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Projects", to: "/projects" },
          { label: project.name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {project.name}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 uppercase">
                {project.environment}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {project.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/migrations/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New migration</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 dark:border-slate-800/80 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              type="button"
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
              {tab.count !== undefined && tab.count !== null && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {/* OVERVIEW TAB */}
        {activeTab === "Overview" && (
          <div className="space-y-8">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Associated Migrations
                </span>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {projectMigrations.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Configured in control plane
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Associated Users
                </span>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {projectUsers.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Team members with project access
                </p>
              </div>
            </div>

            {/* Active Migrations in this Project */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Project Migrations
              </h2>
              {projectMigrations.length === 0 ? (
                <EmptyState
                  icon={ArrowRightLeft}
                  title="No migrations configured for this project"
                  description="No migrations have been created for this project yet. Create a migration job to transfer schema or data across your systems."
                  actionLabel="Create migration"
                  onAction={() => navigate("/migrations/new")}
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
                  {projectMigrations.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/migrations/${m.id}`}
                            className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {m.name}
                          </Link>
                          <StatusBadge status={m.status} />
                        </div>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          {m.sourceTargetLabel}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                        <span>
                          {typeof m.progress === "number"
                            ? `${m.progress.toFixed(1)}%`
                            : m.progress || "0%"}
                        </span>
                        <Link
                          to={`/migrations/${m.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-sans font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MIGRATIONS TAB */}
        {activeTab === "Migrations" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500">
                Showing {projectMigrations.length} migrations
              </p>
              <Link
                to="/migrations/new"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add migration
              </Link>
            </div>
            {projectMigrations.length === 0 ? (
              <EmptyState
                icon={ArrowRightLeft}
                title="No migrations configured for this project"
                description="No migrations have been created for this project yet. Create a migration job to transfer schema or data across your systems."
                actionLabel="Create migration"
                onAction={() => navigate("/migrations/new")}
              />
            ) : (
              <div className="space-y-3">
                {projectMigrations.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">{m.name}</h4>
                        <StatusBadge status={m.status} />
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        {m.sourceTargetLabel}
                      </p>
                    </div>
                    <Link
                      to={`/migrations/${m.id}`}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Open →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "Users" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Project Users
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Users and team members associated with this project.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Showing {projectUsers.length} user
                {projectUsers.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200 dark:border-indigo-800">
                      {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {u.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-medium ${
                            u.role === "creator"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                    {u.joinedAt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "Settings" && (
          <div className="max-w-xl space-y-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Project Settings
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  key={project.name}
                  defaultValue={project.name}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  key={project.description}
                  defaultValue={project.description}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  showToast("Saved", "Project metadata updated.", "success")
                }
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>

            {/* Danger Zone */}
            <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                Danger Zone
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Archiving or deleting this project will unbind associated
                migration checkpoints.
              </p>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Project</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title="Delete this project?"
        description={`Are you sure you want to delete "${project.name}"? Active migration jobs will be halted.`}
        confirmLabel="Delete Project"
        isDestructive={true}
        onConfirm={handleDeleteProject}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
