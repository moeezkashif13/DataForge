import { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Download,
  Zap,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { useToast } from "../context/ToastContext";

export default function Billing() {
  const { invoices } = useData();
  const { showToast } = useToast();

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Billing &amp; Infrastructure Quotas
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your organization plan, usage quotas, and payment history.
        </p>
      </div>

      {/* Plan Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                CURRENT PLAN
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                DataForge Pro
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Production-grade control plane orchestration for enterprise
              workloads.
            </p>
          </div>

          <div className="flex items-baseline gap-1 text-right sm:text-right">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              $99
            </span>
            <span className="text-xs text-slate-400">/ month</span>
          </div>
        </div>

        {/* Usage meters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Meter 1 */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">Records Migrated</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                4.82M / 10M
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-600"
                style={{ width: "48.2%" }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              48% of monthly allocation
            </p>
          </div>

          {/* Meter 2 */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">Active Migrations</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                3 / 20
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: "15%" }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              17 concurrent slots available
            </p>
          </div>

          {/* Meter 3 */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">Enrolled Agents</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                5 / 10
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500"
                style={{ width: "50%" }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              5 agent seats available
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() =>
              showToast(
                "Stripe Billing Portal",
                "Redirecting to secure Stripe billing portal...",
                "info",
              )
            }
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95"
          >
            Manage Plan &amp; Seats
          </button>
          <button
            type="button"
            onClick={() =>
              showToast(
                "Payment Method",
                "Card on file ending in •••• 4242",
                "info",
              )
            }
            className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Update Payment Method
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Payment Invoices
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="p-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3 font-mono">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {inv.id}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{inv.date}</span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {inv.amount}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  {inv.status}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    showToast("Receipt", `Downloading ${inv.id}.pdf...`, "info")
                  }
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Download receipt"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
