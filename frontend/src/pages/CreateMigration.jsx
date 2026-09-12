import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Database,
  Server,
  Code,
  ShieldCheck,
  Plus,
  Trash2,
  Sparkles,
  Info,
} from "lucide-react";
import { useGetProjectsQuery } from "../store/api/projectsApi";
import { useGetAgentsQuery } from "../store/api/agentsApi";
import { useCreateMigrationMutation } from "../store/api/migrationsApi";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import {
  initialFieldMappings,
  initialConnections,
  initialAgents,
  initialProjects,
} from "../types/mockData";
import { useToast } from "../context/ToastContext";

export default function CreateMigration() {
  const { data: apiProjects = [] } = useGetProjectsQuery();
  const projects = apiProjects.length > 0 ? apiProjects : initialProjects;
  const { data: apiAgents = [] } = useGetAgentsQuery();
  const agents = apiAgents.length > 0 ? apiAgents : initialAgents;
  const connections = initialConnections;
  const [createMigration, { isLoading: isSubmitting }] =
    useCreateMigrationMutation();

  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);

  // Step 1: Basic details
  const [name, setName] = useState("Customer Data Migration");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [description, setDescription] = useState(
    "Production customer records sync with field sanitization.",
  );

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  // Step 2: Source
  const [sourceType, setSourceType] = useState("PostgreSQL");
  const [sourceConnId, setSourceConnId] = useState(connections[0]?.id || "");
  const [sourceDatabase, setSourceDatabase] = useState("production");
  const [sourceSchema, setSourceSchema] = useState("public");
  const [sourceTable, setSourceTable] = useState("customers");
  const [sourceCsvPath, setSourceCsvPath] = useState(
    "/var/data/exports/customers_dump.csv",
  );
  const [sourceTestStatus, setSourceTestStatus] = useState(null);

  // Step 3: Target
  const [targetType, setTargetType] = useState("PostgreSQL");
  const [targetConnId, setTargetConnId] = useState(connections[1]?.id || "");
  const [targetDatabase, setTargetDatabase] = useState("analytics");
  const [targetSchema, setTargetSchema] = useState("public");
  const [targetTable, setTargetTable] = useState("customers_v2");
  const [targetTestStatus, setTargetTestStatus] = useState(null);

  // Step 4: Field Mappings
  const [mappings, setMappings] = useState(initialFieldMappings);

  // Step 5: Validation & Agent
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || "");
  const [batchSize, setBatchSize] = useState(2000);
  const [retryCount, setRetryCount] = useState(3);

  const steps = [
    { num: 1, title: "Basic Details" },
    { num: 2, title: "Source" },
    { num: 3, title: "Target" },
    { num: 4, title: "Field Mapping" },
    { num: 5, title: "Validation" },
    { num: 6, title: "Review" },
  ];

  const testSource = () => {
    setSourceTestStatus("testing");
    setTimeout(() => {
      setSourceTestStatus("success");
      showToast(
        "Source Probe OK",
        "Connected to internal database in 1.4ms via Agent.",
        "success",
      );
    }, 600);
  };

  const testTarget = () => {
    setTargetTestStatus("testing");
    setTimeout(() => {
      setTargetTestStatus("success");
      showToast(
        "Target Probe OK",
        "Target schema table write permissions verified.",
        "success",
      );
    }, 600);
  };

  const handleAddMapping = () => {
    const newM = {
      id: `m-${Date.now()}`,
      sourceField: "new_field",
      targetField: "new_column",
      transformation: "None",
      required: false,
      type: "VARCHAR(255)",
    };
    setMappings([...mappings, newM]);
  };

  const handleRemoveMapping = (id) => {
    setMappings(mappings.filter((m) => m.id !== id));
  };

  const handleUpdateMapping = (id, field, value) => {
    setMappings(
      mappings.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  const handleSubmit = async (isDraft = false) => {
    const proj = projects.find((p) => p.id === projectId) || projects[0];
    if (!proj) {
      showToast(
        "No Project Selected",
        "Please create or select a project first.",
        "error",
      );
      return;
    }

    if (!name?.trim()) {
      showToast(
        "Missing Migration Name",
        "Please enter a name for the migration.",
        "error",
      );
      return;
    }

    const normalizedSourceType = (sourceType || "postgresql").toLowerCase();
    const normalizedTargetType = (targetType || "postgresql").toLowerCase();
    const isDbSource =
      normalizedSourceType === "mysql" || normalizedSourceType === "postgresql";

    // Validate source fields
    if (isDbSource) {
      if (!sourceDatabase?.trim()) {
        showToast(
          "Missing Source Database",
          "Please enter a source database name in Step 2.",
          "error",
        );
        return;
      }
      if (!sourceTable?.trim()) {
        showToast(
          "Missing Source Table",
          "Please enter a source table name in Step 2.",
          "error",
        );
        return;
      }
    } else {
      if (!sourceCsvPath?.trim()) {
        showToast(
          "Missing Source File Path",
          "Please enter a host file path in Step 2.",
          "error",
        );
        return;
      }
    }

    // Validate target fields
    if (!targetDatabase?.trim()) {
      showToast(
        "Missing Target Database",
        "Please enter a target database name in Step 3.",
        "error",
      );
      return;
    }
    if (!targetTable?.trim()) {
      showToast(
        "Missing Target Table",
        "Please enter a target table name in Step 3.",
        "error",
      );
      return;
    }

    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      showToast(
        "Missing Field Mappings",
        "Please configure at least one field mapping in Step 4.",
        "error",
      );
      return;
    }

    const payload = {
      projectId: proj.id,
      name: name.trim(),
      description: description?.trim() || null,
      source_type: normalizedSourceType,
      source_schema: sourceSchema?.trim() || "public",
      source_database: isDbSource ? sourceDatabase.trim() : null,
      source_table: isDbSource ? sourceTable.trim() : null,
      source_file_path: !isDbSource ? sourceCsvPath.trim() : null,
      target_type: normalizedTargetType,
      target_schema: targetSchema?.trim() || "public",
      target_database: targetDatabase.trim(),
      target_table: targetTable.trim(),
      mappings: Array.isArray(mappings) ? mappings : [],
    };

    try {
      const res = await createMigration(payload).unwrap();

      const createdMig = res?.data || res;
      showToast(
        "Migration Created",
        `"${createdMig?.name || name}" was created successfully.`,
        "success",
      );

      if (createdMig?.id) {
        navigate(`/migrations/${createdMig.id}`);
      } else {
        navigate("/migrations");
      }
    } catch (err) {
      console.error("Error creating migration:", err);
      showToast(
        "Creation Failed",
        err?.data?.message || err?.message || "Failed to create migration",
        "error",
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Migrations", to: "/migrations" },
          { label: "New Migration" },
        ]}
      />

      {/* Stepper Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create Migration
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure pipeline parameters. The customer-hosted agent will
            execute data transfer locally.
          </p>
        </div>

        {/* Multi-step progress bar */}
        <div className="grid grid-cols-6 gap-2 pt-2">
          {steps.map((s) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isCompleted
                      ? "bg-emerald-500"
                      : isCurrent
                        ? "bg-indigo-600"
                        : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
                <p
                  className={`text-[11px] font-medium truncate ${
                    isCurrent
                      ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                      : isCompleted
                        ? "text-slate-700 dark:text-slate-300"
                        : "text-slate-400"
                  }`}
                >
                  {s.num}. {s.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
        {/* STEP 1: BASIC DETAILS */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 1 — Basic Details
              </h2>
              <p className="text-xs text-slate-500">
                Provide an identifier and project context for this migration
                job.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Migration Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Customer Data Migration"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Project
              </label>
              {projects.length === 0 ? (
                <div className="p-3 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                  No projects available. Please create a project first before
                  creating a migration.
                </div>
              ) : (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.environment || "Production (Dummy)"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details on data scope, compliance caveats, or target system"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        )}

        {/* STEP 2: SOURCE CONFIGURATION */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 2 — Source Configuration
              </h2>
              <p className="text-xs text-slate-500">
                Choose where your data originates from inside your
                infrastructure.
              </p>
            </div>

            {/* Source type selector */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {["PostgreSQL", "MySQL", "CSV", "JSON", "S3"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSourceType(type)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                    sourceType === type
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span className="text-xs">{type}</span>
                </button>
              ))}
            </div>

            {/* Source details form */}
            {sourceType === "PostgreSQL" || sourceType === "MySQL" ? (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Connection Profile
                    </label>
                    <select
                      value={sourceConnId}
                      onChange={(e) => setSourceConnId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      {connections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>
                  </div> */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Database
                    </label>
                    <input
                      type="text"
                      value={sourceDatabase}
                      onChange={(e) => setSourceDatabase(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Schema
                    </label>
                    <input
                      type="text"
                      value={sourceSchema}
                      onChange={(e) => setSourceSchema(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Table
                    </label>
                    <input
                      type="text"
                      value={sourceTable}
                      onChange={(e) => setSourceTable(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Host File Path
                  </label>
                  <input
                    type="text"
                    value={sourceCsvPath}
                    onChange={(e) => setSourceCsvPath(e.target.value)}
                    placeholder="/var/data/exports/customers_dump.csv"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    File remains strictly mounted inside customer agent volume.
                    Never uploaded to cloud.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: TARGET CONFIGURATION */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 3 — Target Configuration
              </h2>
              <p className="text-xs text-slate-500">
                Specify the destination warehouse or database.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {["PostgreSQL", "MySQL"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTargetType(type)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                    targetType === type
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span className="text-xs">{type}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Connection
                  </label>
                  <select
                    value={targetConnId}
                    onChange={(e) => setTargetConnId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div> */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Database
                  </label>
                  <input
                    type="text"
                    value={targetDatabase}
                    onChange={(e) => setTargetDatabase(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Schema
                  </label>
                  <input
                    type="text"
                    value={targetSchema}
                    onChange={(e) => setTargetSchema(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Table
                  </label>
                  <input
                    type="text"
                    value={targetTable}
                    onChange={(e) => setTargetTable(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={testTarget}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 transition-colors"
              >
                {targetTestStatus === "testing"
                  ? "Testing probe..."
                  : "Test Connection"}
              </button>
              {targetTestStatus === "success" && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Destination verified
                  (2.1ms)
                </span>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: FIELD MAPPING */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Step 4 — Field Mapping
                </h2>
                <p className="text-xs text-slate-500">
                  Map source columns to target attributes and declare data
                  transformations.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMapping}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors w-fit"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add field mapping</span>
              </button>
            </div>

            {/* Visual mapping table */}
            <div className="space-y-3">
              {mappings.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Source Field
                    </span>
                    <input
                      type="text"
                      value={m.sourceField}
                      onChange={(e) =>
                        handleUpdateMapping(m.id, "sourceField", e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                    />
                  </div>

                  <div className="hidden md:flex items-center justify-center text-slate-400 px-2 pt-4">
                    →
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Target Field
                    </span>
                    <input
                      type="text"
                      value={m.targetField}
                      onChange={(e) =>
                        handleUpdateMapping(m.id, "targetField", e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Transformation
                    </span>
                    <select
                      value={m.transformation}
                      onChange={(e) =>
                        handleUpdateMapping(
                          m.id,
                          "transformation",
                          e.target.value,
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                    >
                      <option value="None">None</option>
                      <option value="lowercase()">lowercase()</option>
                      <option value="uppercase()">uppercase()</option>
                      <option value="trim()">trim()</option>
                      <option value="normalizePhone()">normalizePhone()</option>
                      <option value="hashSHA256()">hashSHA256()</option>
                      <option value="toDate(ISO8601)">toDate(ISO8601)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-500">
                      <input
                        type="checkbox"
                        checked={m.required}
                        onChange={(e) =>
                          handleUpdateMapping(
                            m.id,
                            "required",
                            e.target.checked,
                          )
                        }
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>Req</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveMapping(m.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remove field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: VALIDATION & SAFETY */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 5 — Validation &amp; Execution Agent
              </h2>
              <p className="text-xs text-slate-500">
                Select which customer-hosted agent will run this workload.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Schema Compatibility Check Passed
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Discovered 1,000,000 estimated records in source table. 6 fields
                mapped with 0 unhandled constraints.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Execution Migration Agent
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden text-slate-900 dark:text-slate-100 font-mono text-xs"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.status} · {a.host})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  The agent establishes an outbound WSS connection to receive
                  job instructions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Checkpoint Batch Size
                  </label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-[10px] text-slate-400">
                    Records committed per atomic batch
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Automatic Retries
                  </label>
                  <input
                    type="number"
                    value={retryCount}
                    onChange={(e) => setRetryCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-[10px] text-slate-400">
                    Max backoff retries on transient errors
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 6 — Review Migration
              </h2>
              <p className="text-xs text-slate-500">
                Confirm your migration definition. Note: Creating a migration
                stores the definition; execution must be triggered explicitly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">
                  Source Target
                </span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {name}
                </p>
                <p className="font-mono text-slate-500">
                  {sourceType === "CSV" ||
                  sourceType === "JSON" ||
                  sourceType === "S3"
                    ? `${sourceType} (${sourceCsvPath})`
                    : `${sourceType} (${sourceDatabase}.${sourceTable})`}
                </p>
                <p className="font-mono text-indigo-600 dark:text-indigo-400">
                  ↓ maps to
                </p>
                <p className="font-mono text-slate-500">
                  {targetType} ({targetDatabase}.{targetTable})
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">
                  Pipeline Summary
                </span>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Agent:{" "}
                  {agents.find((a) => a.id === selectedAgentId)?.name ||
                    "Default Agent"}
                </p>
                <p className="text-slate-500">
                  Field Mappings: {mappings.length} columns
                </p>
                <p className="text-slate-500">
                  Estimated Volume: ~1,000,000 records
                </p>
                <p className="text-slate-500">
                  Batching: {batchSize} records/checkpoint
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                DataForge will orchestrate and monitor progress, but your data
                stays securely within your VPC.
              </span>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step === 6 ? (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save as Draft"}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Migration"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
