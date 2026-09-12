import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectIsAuthenticated,
  selectOrganizationId,
  setCredentials,
} from "../store/slices/authSlice";
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
} from "../store/api/projectsApi";
import {
  useGetAgentsQuery,
  useCreateAgentMutation,
  useGenerateAgentTokenMutation,
  useDeleteAgentMutation,
} from "../store/api/agentsApi";
import {
  initialWorkspaces,
  initialProjects,
  initialAgents,
  initialConnections,
  initialMigrations,
  initialActivities,
  initialLogs,
  initialTeam,
  initialInvoices,
} from "../types/mockData";
import { useToast } from "./ToastContext";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { showToast } = useToast();

  // Theme state
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("datarelay_theme");
      if (saved) return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("datarelay_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Workspaces
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [currentWorkspace, setCurrentWorkspace] = useState(
    initialWorkspaces[0],
  );

  const switchWorkspace = (wsId) => {
    const found = workspaces.find((w) => w.id === wsId);
    if (found) {
      setCurrentWorkspace(found);
      showToast(
        "Workspace Switched",
        `Active workspace: ${found.name} (${found.environment})`,
        "info",
      );
    }
  };

  const createWorkspace = (name, environment) => {
    const newWs = {
      id: `ws-${Date.now()}`,
      name,
      environment: environment || "Production",
      active: false,
    };
    setWorkspaces((prev) => [...prev, newWs]);
    setCurrentWorkspace(newWs);
    showToast(
      "Workspace Created",
      `Successfully switched to ${name}`,
      "success",
    );
  };

  // Projects
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const organizationId = useSelector(selectOrganizationId);

  const {
    data: apiProjects,
    isLoading: isProjectsLoading,
    refetch: refetchProjects,
  } = useGetProjectsQuery(organizationId || undefined, {
    skip: !isAuthenticated,
  });
  const [createProjectMutation] = useCreateProjectMutation();

  // useEffect(() => {
  //   if (apiProjects?.organizationId && !organizationId) {
  //     dispatch(setCredentials({ organizationId: apiProjects.organizationId }));
  //   }
  // }, [apiProjects, organizationId, dispatch]);

  const [localProjects, setLocalProjects] = useState([]);
  const projects =
    isAuthenticated && apiProjects
      ? apiProjects
      : localProjects.length
        ? localProjects
        : initialProjects;

  const addProject = async (projectData) => {
    const activeOrgId =
      organizationId ||
      apiProjects?.organizationId ||
      apiProjects?.[0]?.organizationId;

    if (isAuthenticated && activeOrgId) {
      try {
        const res = await createProjectMutation({
          organizationId: activeOrgId,
          name: projectData.name,
          description: projectData.description,
          userIds: [],
        }).unwrap();

        addActivity({
          type: "PROJECT_CREATED",
          title: "Project created",
          detail: `Project "${projectData.name}" initialized in ${projectData.environment || "Production (Dummy)"}`,
          user: "Current User",
          icon: "folder",
          severity: "info",
        });
        showToast(
          "Project Created",
          `Project "${projectData.name}" created successfully.`,
          "success",
        );
        return res;
      } catch (err) {
        console.error("API create project error:", err);
        showToast(
          "Project Creation Failed",
          err?.data?.message || "Error creating project",
          "error",
        );
      }
    }

    const newProj = {
      id: `proj-${Date.now()}`,
      slug: projectData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      migrationCount: "0 (Dummy)",
      agentCount: "1 (Dummy)",
      lastActivity: "Just now (Dummy)",
      status: "ACTIVE",
      environment: projectData.environment || "Production (Dummy)",
      createdAt: new Date().toISOString(),
      ...projectData,
    };
    setLocalProjects((prev) => [newProj, ...prev]);
    addActivity({
      type: "PROJECT_CREATED",
      title: "Project created",
      detail: `Project "${newProj.name}" initialized in ${newProj.environment}`,
      user: "Current User",
      icon: "folder",
      severity: "info",
    });
    showToast(
      "Project Created",
      `Project "${newProj.name}" is now ready.`,
      "success",
    );
    return newProj;
  };

  // Agents
  const {
    data: apiAgents,
    isLoading: isAgentsLoading,
    refetch: refetchAgents,
  } = useGetAgentsQuery(organizationId || undefined, {
    skip: !isAuthenticated,
  });
  const [createAgentMutation] = useCreateAgentMutation();
  const [generateAgentTokenMutation] = useGenerateAgentTokenMutation();
  const [deleteAgentMutation] = useDeleteAgentMutation();

  const [localAgents, setLocalAgents] = useState([]);
  const agents =
    isAuthenticated && apiAgents
      ? apiAgents
      : localAgents.length
        ? localAgents
        : initialAgents;

  const registerAgent = async (agentData) => {
    const activeOrgId =
      organizationId ||
      apiProjects?.organizationId ||
      apiAgents?.[0]?.organizationId;

    console.log(apiProjects);
    console.log(apiAgents);

    if (isAuthenticated) {
      try {
        const payload = {
          organizationId: activeOrgId,
          name: agentData.name,
          description:
            agentData.description || "Customer-hosted migration agent (Dummy)",
        };
        console.log(payload);

        const res = await createAgentMutation(payload).unwrap();
        const created = res?.data || res;

        addActivity({
          type: "AGENT_ENROLLED",
          title: "Agent registered",
          detail: `Agent "${created.name || agentData.name}" successfully enrolled via secure token`,
          user: "Current User",
          icon: "server",
          severity: "success",
        });
        if (refetchAgents) refetchAgents();
        return created;
      } catch (err) {
        console.error("Failed to register agent via backend:", err);
        showToast(
          "Creation Failed",
          err?.data?.message || err?.message || "Failed to create agent",
          "error",
        );
        throw err;
      }
    }

    const newAgent = {
      id: `agent-${Date.now()}`,
      status: "ONLINE",
      version: "v1.4.2 (Dummy)",
      ip: "10.240.19.102 (Dummy)",
      host: agentData.host || "worker-node-k8s.internal (Dummy)",
      environment: agentData.environment || "Production (Dummy)",
      lastHeartbeat: "Just now (Dummy)",
      lastHeartbeatMs: 1000,
      activeMigrations: 0,
      totalCompleted: 0,
      uptime: "100% (< 1 hour) (Dummy)",
      cpuUsage: "3% (Dummy)",
      memUsage: "340 MB / 8 GB (Dummy)",
      networkEgress: "0.0 MB/s (Dummy)",
      dockerImage: "dataforge/migration-agent:v1.4.2 (Dummy)",
      registeredAt: new Date().toISOString(),
      ...agentData,
    };
    setLocalAgents((prev) => [newAgent, ...prev]);
    addActivity({
      type: "AGENT_ENROLLED",
      title: "Agent registered",
      detail: `Agent "${newAgent.name}" successfully enrolled via secure token`,
      user: "Current User",
      icon: "server",
      severity: "success",
    });
    showToast(
      "Agent Online",
      `Agent "${newAgent.name}" connected via WebSocket.`,
      "success",
    );
    return newAgent;
  };

  const deleteAgent = async (agentId) => {
    if (isAuthenticated && !agentId?.startsWith("agent-")) {
      try {
        await deleteAgentMutation(agentId).unwrap();
        if (refetchAgents) refetchAgents();
      } catch (err) {
        console.error("Failed to delete agent on backend:", err);
        showToast(
          "Delete Failed",
          err?.data?.message || err?.message || "Failed to delete agent",
          "error",
        );
        throw err;
      }
    }

    setLocalAgents((prev) => prev.filter((a) => a.id !== agentId));
    addActivity({
      type: "AGENT_REMOVED",
      title: "Agent deleted",
      detail: `Agent ${agentId} and related connection tokens were permanently removed`,
      user: "Current User",
      icon: "server",
      severity: "warning",
    });
    showToast(
      "Agent Deleted",
      "Agent and all associated connection tokens have been removed.",
      "success",
    );
  };

  // Connections
  const [connections, setConnections] = useState(initialConnections);

  const addConnection = (connData) => {
    const newConn = {
      id: `conn-${Date.now()}`,
      status: "HEALTHY",
      lastTested: "Just now",
      latencyMs: 1.5,
      managedBy: "Customer Vault / Secret Manager",
      ...connData,
    };
    setConnections((prev) => [newConn, ...prev]);
    addActivity({
      type: "CONNECTION_ADDED",
      title: "Connection profile created",
      detail: `Configured ${newConn.type} endpoint "${newConn.name}"`,
      user: "Abdul Moeez",
      icon: "database",
      severity: "info",
    });
    showToast(
      "Connection Profile Added",
      `Endpoint ${newConn.name} verified.`,
      "success",
    );
    return newConn;
  };

  const testConnection = async (connId) => {
    // Simulated connection test
    return new Promise((resolve) => {
      setTimeout(() => {
        setConnections((prev) =>
          prev.map((c) =>
            c.id === connId
              ? { ...c, lastTested: "Just now", status: "HEALTHY" }
              : c,
          ),
        );
        showToast(
          "Connection Verified",
          "Control plane probe responded in 1.9ms with TLS 1.3.",
          "success",
        );
        resolve({ success: true, latencyMs: 1.9 });
      }, 700);
    });
  };

  // Activities & Logs
  const [activities, setActivities] = useState(initialActivities);
  const [logs, setLogs] = useState(initialLogs);

  const addActivity = (act) => {
    const newAct = {
      id: `act-${Date.now()}`,
      timestamp: "Just now",
      ...act,
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  const addLog = (logEntry) => {
    const newLog = {
      id: `l-${Date.now()}`,
      time: new Date().toLocaleTimeString("en-US", { hour12: false }) + ".000",
      ...logEntry,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  // Team
  const [team, setTeam] = useState(initialTeam);

  const inviteMember = (email, role) => {
    const name = email.split("@")[0].replace(".", " ");
    const initials = name
      .split(" ")
      .map((s) => s[0]?.toUpperCase() || "")
      .join("")
      .substring(0, 2);
    const newMember = {
      id: `u-${Date.now()}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email,
      role,
      avatar: initials || "US",
      status: "Pending Invite",
      joined: "Today",
    };
    setTeam((prev) => [...prev, newMember]);
    showToast(
      "Invitation Sent",
      `Sent workspace invitation to ${email}`,
      "success",
    );
  };

  // Real-time progress simulator (simulates active stream in control plane)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setMigrationOverrides((prev) => {
  //       const next = { ...prev };
  //       let hasChanges = false;
  //       for (const m of baseMigrations) {
  //         const current = next[m.id] ? { ...m, ...next[m.id] } : m;
  //         if (
  //           current.status === "RUNNING" &&
  //           typeof current.recordsProcessed === "number" &&
  //           typeof current.recordsTotal === "number" &&
  //           current.recordsProcessed < current.recordsTotal
  //         ) {
  //           const increment = Math.floor(Math.random() * 250) + 150;
  //           const newProcessed = Math.min(
  //             current.recordsTotal,
  //             current.recordsProcessed + increment,
  //           );
  //           const failedIncrement =
  //             Math.random() > 0.85 ? Math.floor(Math.random() * 3) : 0;
  //           const newSucceeded =
  //             (current.recordsSucceeded || 0) + (increment - failedIncrement);
  //           const newFailed = (current.recordsFailed || 0) + failedIncrement;
  //           const newProgress = Number(
  //             ((newProcessed / current.recordsTotal) * 100).toFixed(1),
  //           );

  //           next[m.id] = {
  //             ...(next[m.id] || {}),
  //             recordsProcessed: newProcessed,
  //             recordsSucceeded: newSucceeded,
  //             recordsFailed: newFailed,
  //             progress: newProgress,
  //             status:
  //               newProcessed >= current.recordsTotal ? "COMPLETED" : "RUNNING",
  //           };
  //           hasChanges = true;
  //         }
  //       }
  //       return hasChanges ? next : prev;
  //     });
  //   }, 3500);

  //   return () => clearInterval(interval);
  // }, [baseMigrations]);

  return (
    <DataContext.Provider
      value={{
        theme,
        toggleTheme,
        workspaces,
        currentWorkspace,
        switchWorkspace,
        createWorkspace,
        projects,
        isProjectsLoading,
        refetchProjects,
        addProject,
        agents,
        isAgentsLoading,
        refetchAgents,
        registerAgent,
        generateAgentToken: generateAgentTokenMutation,
        deleteAgent,
        connections,
        addConnection,
        testConnection,
        // migrations,
        // isMigrationsLoading,
        // refetchMigrations,
        // addMigration,
        // startMigration,
        // pauseMigration,
        // resumeMigration,
        // cancelMigration,
        // deleteMigration,
        activities,
        addActivity,
        logs,
        addLog,
        team,
        inviteMember,
        invoices: initialInvoices,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
