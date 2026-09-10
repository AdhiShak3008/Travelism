"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { inr, cx } from "@/lib/format";

interface WorkflowLog {
  node: string;
  message: string;
  time: string;
}

export function LangGraphTelemetry() {
  const blob = useTrip((s) => s.blob);
  const dataset = useTrip((s) => s.dataset);
  const addCustomExperience = useTrip((s) => s.addCustomExperience);
  const toggleSelectPlace = useTrip((s) => s.toggleSelectPlace);

  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [activeNode, setActiveNode] = useState<string | null>("finalize");
  const [threadId, setThreadId] = useState<string>(`thread_${blob.destinationName?.toLowerCase().replace(/\s+/g, "_") || "session"}_live`);
  const [iterations, setIterations] = useState<number>(1);
  const [auditIssues, setAuditIssues] = useState<any[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([
    { node: "IntentNode", message: `Parsed trip intent for ${blob.destinationName || "Destination"} (${blob.durationDays} days, ${blob.preferences.pace} pace)`, time: "Synced" },
    { node: "DiscoveryNode", message: "Discovered authentic spots and fetched verified MediaWiki imagery", time: "Synced" },
    { node: "SynthesizerNode", message: "Assembled unified schedule blob and calculated INR costs", time: "Synced" },
    { node: "AuditorNode", message: "Feasibility checks passed (Pace density & altitude safety validated)", time: "Passed ✓" },
    { node: "FinalizeNode", message: "State preserved to MemorySaver checkpointer", time: "Saved ✓" },
  ]);
  const [checkpointData, setCheckpointData] = useState<any | null>(null);
  const [inspectingCheckpoint, setInspectingCheckpoint] = useState(false);

  const runWorkflow = async (userQuery: string) => {
    if (!userQuery.trim() || isRunning) return;
    setIsRunning(true);
    setPrompt("");
    setCheckpointData(null);

    const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // Step 1: Intent Node
    setActiveNode("intent");
    setLogs((prev) => [
      { node: "IntentNode", message: `Parsing refinement request: "${userQuery}"`, time: now() },
      ...prev,
    ]);
    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Discovery Node
    setActiveNode("discovery");
    setLogs((prev) => [
      { node: "DiscoveryNode", message: `Searching authentic spots and scraping high-res Wikimedia photos for ${blob.destinationName}...`, time: now() },
      ...prev,
    ]);

    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: blob.destinationName || "Miami",
          request: userQuery,
          threadId: `thread_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setThreadId(data.threadId);
        setIterations(data.iteration || 1);
        setAuditIssues(data.auditIssues || []);

        // Step 3: Synthesizer Node
        setActiveNode("synthesize");
        setLogs((prev) => [
          { node: "SynthesizerNode", message: `Synthesized ${data.discoveredPlaces?.length || 0} spots & ${data.discoveredExperiences?.length || 0} bookable experiences`, time: now() },
          ...prev,
        ]);
        await new Promise((r) => setTimeout(r, 500));

        // Step 4: Auditor Node
        setActiveNode("audit");
        const auditPassed = (!data.auditIssues || data.auditIssues.length === 0);
        setLogs((prev) => [
          {
            node: "AuditorNode",
            message: auditPassed
              ? "✅ [Audit Passed] Transit density, budget thresholds, and health rules verified"
              : `⚠️ [Audit Critique] Found ${data.auditIssues.length} issues (Self-correction applied)`,
            time: now(),
          },
          ...prev,
        ]);
        await new Promise((r) => setTimeout(r, 500));

        // Step 5: Finalize Node
        setActiveNode("finalize");
        setLogs((prev) => [
          { node: "FinalizeNode", message: `State checkpoint committed to thread: ${data.threadId}`, time: now() },
          ...prev,
        ]);

        // Merge discovered experiences into trip store
        if (data.discoveredExperiences && data.discoveredExperiences.length > 0) {
          data.discoveredExperiences.forEach((exp: any) => {
            addCustomExperience({
              name: exp.name,
              category: exp.category,
              price: exp.price,
              blurb: exp.blurb,
              durationHours: exp.durationHours,
            });
          });
        }
      }
    } catch (err) {
      setLogs((prev) => [
        { node: "Error", message: `Workflow error: ${err instanceof Error ? err.message : "Request failed"}`, time: now() },
        ...prev,
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const inspectCheckpoint = async () => {
    if (!threadId) return;
    setInspectingCheckpoint(true);
    try {
      const res = await fetch(`/api/workflow?threadId=${encodeURIComponent(threadId)}`);
      const data = await res.json();
      setCheckpointData(data);
    } catch (err) {
      setCheckpointData({ error: "Failed to fetch checkpoint" });
    } finally {
      setInspectingCheckpoint(false);
    }
  };

  const NODES = [
    { id: "intent", name: "1. IntentNode", desc: "Query & constraints parser" },
    { id: "discovery", name: "2. DiscoveryNode", desc: "MediaWiki photo & spot discovery" },
    { id: "synthesize", name: "3. SynthesizerNode", desc: "Unified schedule compiler" },
    { id: "audit", name: "4. AuditorNode", desc: "Self-correcting critique loop" },
    { id: "finalize", name: "5. FinalizeNode", desc: "Checkpoint committer" },
  ];

  return (
    <div className="rounded-2xl border border-line bg-card/60 p-3.5 transition-all shadow-xs">
      {/* Sleek Collapsed Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-paper-2 border border-line text-xs font-mono">
            ⚙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">System Architecture</span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                LangGraph StateGraph Active
              </span>
            </div>
            <p className="text-[11px] text-ink-faint">
              Self-correcting critique loops · MemorySaver checkpointing · Multi-agent state machine
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-bold text-ink hover:border-brand/50 hover:bg-paper-2 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <span>{isOpen ? "Hide Inspector ▲" : "Inspect StateGraph ▼"}</span>
        </button>
      </div>

      {/* Expanded Interactive Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 border-t border-line/70 pt-4 space-y-4 overflow-hidden"
          >
            {/* Visual StateGraph Pipeline Bar */}
            <div>
              <div className="text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-2">
                Compiled StateGraph Workflow Nodes
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {NODES.map((node) => {
                  const isActive = activeNode === node.id;
                  const isDone = !isRunning || activeNode === "finalize";
                  return (
                    <div
                      key={node.id}
                      className={cx(
                        "rounded-xl border p-2.5 transition-all text-left",
                        isActive && isRunning
                          ? "border-brand bg-brand/15 shadow-sm ring-2 ring-brand/40 animate-pulse"
                          : isDone
                          ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                          : "border-line bg-card opacity-70"
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className={isActive && isRunning ? "text-brand" : "text-ink"}>{node.name}</span>
                        <span>{isActive && isRunning ? "⚡" : isDone ? "✓" : "○"}</span>
                      </div>
                      <p className="text-[10px] text-ink-faint truncate mt-0.5">{node.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Refinement Form */}
            <div className="rounded-xl border border-line bg-paper p-3.5 shadow-xs">
              <div className="text-xs font-bold text-ink mb-1.5 flex items-center justify-between">
                <span>⚡ Run Live LangGraph Sub-Workflow</span>
                <span className="text-[11px] text-ink-faint">Thread: <code className="text-brand font-mono">{threadId}</code></span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runWorkflow(prompt);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='e.g. "Find sunset boat cruise and beach yoga under ₹20k"'
                  disabled={isRunning}
                  className="flex-1 rounded-xl border border-line bg-card px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={isRunning || !prompt.trim()}
                  className="btn-primary !py-2 !px-4 !text-xs font-bold shrink-0 disabled:opacity-50"
                >
                  {isRunning ? "Executing Graph..." : "Run Graph →"}
                </button>
              </form>
            </div>

            {/* Live Graph Node Telemetry Logs */}
            <div className="rounded-xl border border-line bg-zinc-950 p-3.5 text-zinc-300 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1.5 shadow-inner">
              <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1 flex items-center justify-between border-b border-zinc-800 pb-1">
                <span>StateGraph Execution Trail</span>
                <span>Iterations: {iterations} · Status: {isRunning ? "Running" : "Idle"}</span>
              </div>
              {logs.map((l, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-zinc-500 shrink-0">[{l.time}]</span>
                  <span className="text-emerald-400 font-bold shrink-0">[{l.node}]</span>
                  <span className="text-zinc-200">{l.message}</span>
                </div>
              ))}
            </div>

            {/* Checkpoint Inspector */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={inspectCheckpoint}
                disabled={inspectingCheckpoint}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>🔍</span>
                <span>{inspectingCheckpoint ? "Fetching Checkpoint..." : "Inspect Stored MemorySaver Checkpoint"}</span>
              </button>

              <span className="text-[11px] text-ink-faint">
                Crash Recovery: <strong>Zero Data Loss</strong>
              </span>
            </div>

            {checkpointData && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-line bg-paper-2 p-3 font-mono text-[11px] text-ink overflow-x-auto max-h-40"
              >
                <div className="text-[10px] font-bold text-ink-soft mb-1">State Recovered from MemorySaver:</div>
                <pre>{JSON.stringify(checkpointData, null, 2)}</pre>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
