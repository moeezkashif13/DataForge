import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Users,
  Plus,
  Mail,
  Shield,
  Trash2,
  CheckCircle2,
  Loader2,
  Copy,
  X,
} from "lucide-react";
import {
  useGetOrganizationMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberPermissionsMutation,
} from "../store/api/organizationApi";
import { selectOrganizationId } from "../store/slices/authSlice";
import { EmptyState } from "../components/ui/EmptyState";
import { useToast } from "../context/ToastContext";

const AVAILABLE_PERMISSIONS = [
  {
    category: "Projects",
    permissions: [
      {
        id: "project:read",
        label: "View Projects",
        description: "Read-only access to view project lists and details.",
      },
      {
        id: "project:create",
        label: "Create Projects",
        description: "Provision and setup new migration projects.",
      },
      {
        id: "project:update",
        label: "Update Projects",
        description: "Modify project settings and configuration.",
      },
      {
        id: "project:delete",
        label: "Delete Projects",
        description: "Permanently delete projects and associated resources.",
      },
    ],
  },
  {
    category: "Execution Agents",
    permissions: [
      {
        id: "agent:read",
        label: "View Agents",
        description: "Monitor agent telemetry and connection health.",
      },
      {
        id: "agent:create",
        label: "Register Agents",
        description: "Generate agent pairing tokens and connect workers.",
      },
      {
        id: "agent:update",
        label: "Update Agents",
        description: "Edit agent parameters and assignment.",
      },
      {
        id: "agent:delete",
        label: "Delete Agents",
        description: "Revoke connection tokens and remove agents.",
      },
    ],
  },
];

export default function Team() {
  const organizationId = useSelector(selectOrganizationId);
  const { data: members = [], isLoading } = useGetOrganizationMembersQuery(
    organizationId || undefined,
  );
  const [inviteMember, { isLoading: isInviting }] = useInviteMemberMutation();
  const [updateMemberPermissions, { isLoading: isUpdatingPermissions }] =
    useUpdateMemberPermissionsMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Operator");
  const [invitedMembers, setInvitedMembers] = useState([]);
  const { showToast } = useToast();

  // State for Manage Permissions Modal
  const [managingMember, setManagingMember] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [memberPermissionsMap, setMemberPermissionsMap] = useState({});

  const handleOpenManage = (member) => {
    setManagingMember(member);
    const existing =
      memberPermissionsMap[member.id] ||
      member.permissions ||
      [];
    setSelectedPermissions(existing);
  };

  const handleTogglePermission = (permId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId],
    );
  };

  const handleSavePermissions = async () => {
    if (!managingMember) return;
    try {
      await updateMemberPermissions({
        memberId: managingMember.id,
        organizationId: organizationId || undefined,
        permissionNames: selectedPermissions,
      }).unwrap();

      setMemberPermissionsMap((prev) => ({
        ...prev,
        [managingMember.id]: selectedPermissions,
      }));

      showToast(
        "Permissions Updated",
        `Permissions successfully updated for ${managingMember.name || managingMember.email}.`,
        "success",
      );
      setManagingMember(null);
    } catch (err) {
      showToast(
        "Update Failed",
        err?.data?.message || err?.message || "Failed to update permissions",
        "error",
      );
    }
  };

  // Combined list ensuring newly invited members render immediately with status "Pending"
  const allMembers = [
    ...members,
    ...invitedMembers.filter(
      (inv) =>
        !members.some((m) => m.email.toLowerCase() === inv.email.toLowerCase()),
    ),
  ];

  const handleInvite = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    try {
      const res = await inviteMember({
        organizationId: organizationId || undefined,
        email: trimmedEmail,
        role,
      }).unwrap();

      const inviteToken = res?.token || res?.invitation?.token;
      const newPendingMember = {
        id: res?.invitation?.id || `inv-${Date.now()}`,
        name: `${trimmedEmail.split("@")[0]} (Invited)`,
        email: trimmedEmail,
        role: role || "Operator",
        status: "Pending",
        joined: "Just now",
        avatar: trimmedEmail.charAt(0).toUpperCase(),
        token: inviteToken,
      };

      setInvitedMembers((prev) => [newPendingMember, ...prev]);

      if (inviteToken && navigator?.clipboard?.writeText) {
        const inviteUrl = `${window.location.origin}/accept-invitation?token=${inviteToken}`;
        navigator.clipboard.writeText(inviteUrl).catch(() => {});
        showToast(
          "Invitation Sent",
          `Invite link copied to clipboard for ${trimmedEmail}!`,
          "success",
        );
      } else {
        showToast(
          "Invitation Sent",
          `Invitation sent to ${trimmedEmail} (status: Pending).`,
          "success",
        );
      }
      setEmail("");
      setIsModalOpen(false);
    } catch (err) {
      showToast(
        "Invitation Failed",
        err?.data?.message || err?.message || "Failed to send invitation",
        "error",
      );
    }
  };

  const roleColors = {
    Owner:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
    Admin:
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
    Operator:
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25",
    Viewer:
      "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Team &amp; Access Control
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage organization team members, workspace permissions, and audit
            visibility.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Invite member</span>
        </button>
      </div>

      {/* Team Table Card */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500 mt-3 font-medium">
            Loading organization members...
          </p>
        </div>
      ) : allMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members found"
          description="There are no members or pending invitations in this organization yet. Invite your colleagues to get started."
          actionLabel="Invite member"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined / Invited</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allMembers.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
                        {member.avatar ||
                          member.name?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        roleColors[member.role] || roleColors.Viewer
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${
                        member.status === "Active"
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-amber-600 dark:text-amber-400 font-medium"
                      }`}
                    >
                      <span
                        className={`min-w-[6px] h-1.5 rounded-full ${
                          member.status === "Active"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      {member.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                    {member.joined}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {member.status === "Pending" ? (
                      <div className="flex items-center justify-end gap-2.5">
                        {member.token && (
                          <button
                            type="button"
                            onClick={() => {
                              const inviteUrl = `${window.location.origin}/accept-invitation?token=${member.token}`;
                              if (navigator?.clipboard?.writeText) {
                                navigator.clipboard.writeText(inviteUrl);
                              }
                              showToast(
                                "Invite Link Copied",
                                `Copied invitation link for ${member.email} to clipboard.`,
                                "success",
                              );
                            }}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-xs cursor-pointer"
                            title="Copy invitation link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy link</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            showToast(
                              "Invitation Pending",
                              `Invitation has been dispatched to ${member.email}.`,
                              "info",
                            )
                          }
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                        >
                          Resend
                        </button>
                      </div>
                    ) : (
                      member.role !== "Owner" && (
                        <button
                          type="button"
                          onClick={() => handleOpenManage(member)}
                          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold text-xs cursor-pointer transition-colors"
                        >
                          Manage
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Invite Team Member
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Send an invitation link to collaborate on migrations and agent
              management.
            </p>

            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="engineer@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="Admin">
                    Admin (Full project &amp; agent controls)
                  </option>
                  <option value="Operator">
                    Operator (Start, pause, view migrations)
                  </option>
                  <option value="Viewer">Viewer (Read-only monitoring)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Invitation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Member Permissions Modal */}
      {managingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center font-mono">
                  {managingMember.avatar ||
                    managingMember.name?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Manage Permissions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {managingMember.name} •{" "}
                    <span className="font-mono">{managingMember.email}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingMember(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-5 flex-1 pr-1">
              {AVAILABLE_PERMISSIONS.map((group) => (
                <div key={group.category} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {group.category}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {
                        group.permissions.filter((p) =>
                          selectedPermissions.includes(p.id),
                        ).length
                      }{" "}
                      of {group.permissions.length} active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {group.permissions.map((perm) => {
                      const isChecked = selectedPermissions.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60"
                              : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePermission(perm.id)}
                            className="mt-0.5 h-4 w-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                {perm.label}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {perm.id}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {perm.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">
                {selectedPermissions.length} permissions selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManagingMember(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdatingPermissions}
                  onClick={handleSavePermissions}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isUpdatingPermissions ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Update Permissions</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
