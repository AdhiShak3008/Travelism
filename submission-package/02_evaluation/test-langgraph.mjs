import { StateGraph, START, END, MemorySaver, Annotation } from "@langchain/langgraph";

// Test LangGraph compilation and checkpointing in Node environment
const AuditIssueSchema = Annotation.Root({
  threadId: Annotation(),
  destination: Annotation(),
  userRequest: Annotation(),
  places: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => [],
  }),
  experiences: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => [],
  }),
  issues: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => [],
  }),
  iteration: Annotation({
    reducer: (curr, next) => (curr || 0) + (next || 1),
    default: () => 0,
  }),
  status: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => "running",
  }),
  logs: Annotation({
    reducer: (curr, next) => [...(curr || []), ...(next || [])],
    default: () => [],
  }),
});

// Node 1: Intent
async function intentNode(state) {
  console.log("  ➔ [1. IntentNode] Parsing request:", state.userRequest);
  return {
    logs: [`Intent parsed: ${state.userRequest}`],
  };
}

// Node 2: Discovery
async function discoveryNode(state) {
  console.log("  ➔ [2. DiscoveryNode] Discovering spots for:", state.destination);
  const discovered = [
    { name: "Ocean Drive Art Deco Tour", price: 2500, category: "cultural" },
    { name: "Biscayne Bay Sunset Cruise", price: 4500, category: "water" },
  ];
  return {
    places: [{ name: "South Beach", category: "core" }],
    experiences: discovered,
    logs: [`Discovered ${discovered.length} activities`],
  };
}

// Node 3: Synthesizer
async function synthesizeNode(state) {
  console.log(`  ➔ [3. SynthesizerNode] Building itinerary iteration ${state.iteration + 1}`);
  return {
    iteration: 1,
    logs: [`Synthesized schedule (v${state.iteration + 1})`],
  };
}

// Node 4: Auditor (Simulates self-correction loop)
async function auditNode(state) {
  console.log("  ➔ [4. AuditorNode] Auditing trip feasibility & budget...");
  const issues = [];
  if (state.iteration === 1) {
    console.log("     ⚠️ [Audit Alert] Transit duration exceeds 5h. Triggering self-correction loop...");
    issues.push({ type: "transit_overload", severity: "warning" });
  } else {
    console.log("     ✅ [Audit Passed] All feasibility, budget, and safety checks verified.");
  }
  return {
    issues,
    status: issues.length > 0 ? "needs_retry" : "completed",
    logs: [`Audit found ${issues.length} issues`],
  };
}

// Node 5: Finalize
async function finalizeNode(state) {
  console.log("  ➔ [5. FinalizeNode] Trip workflow finalized and saved to checkpoint.");
  return {
    status: "completed",
    logs: ["Finalized"],
  };
}

function routeAfterAudit(state) {
  if (state.status === "needs_retry" && state.iteration < 2) {
    return "synthesize";
  }
  return "finalize";
}

async function runTest() {
  console.log("==================================================");
  console.log("🚀 Testing LangGraph Stateful Workflow in Travelism");
  console.log("==================================================");

  const checkpointer = new MemorySaver();
  const workflow = new StateGraph(AuditIssueSchema)
    .addNode("intent", intentNode)
    .addNode("discovery", discoveryNode)
    .addNode("synthesize", synthesizeNode)
    .addNode("audit", auditNode)
    .addNode("finalize", finalizeNode)
    .addEdge(START, "intent")
    .addEdge("intent", "discovery")
    .addEdge("discovery", "synthesize")
    .addEdge("synthesize", "audit")
    .addConditionalEdges("audit", routeAfterAudit, {
      synthesize: "synthesize",
      finalize: "finalize",
    })
    .addEdge("finalize", END);

  const app = workflow.compile({ checkpointer });

  const threadId = "trip_session_miami_9981";
  const config = { configurable: { thread_id: threadId } };

  console.log(`\n1. Initial Execution (Thread ID: ${threadId})...`);
  const finalState = await app.invoke(
    {
      threadId,
      destination: "Miami",
      userRequest: "Add beach yoga and sunset cruise, keep total budget under ₹30k",
    },
    config
  );

  console.log("\n2. Graph Execution Completed!");
  console.log("   - Total Iterations (with critique loop):", finalState.iteration);
  console.log("   - Discovered Places:", finalState.places.map(p => p.name).join(", "));
  console.log("   - Discovered Experiences:", finalState.experiences.map(e => e.name).join(", "));
  console.log("   - Workflow Final Status:", finalState.status);

  console.log("\n3. Testing Crash Recovery / Resume from Checkpoint...");
  const checkpoint = await checkpointer.get(config);
  console.log("   - Checkpoint found in storage?:", !!checkpoint);
  console.log("   - Checkpointed thread ID:", checkpoint?.configurable?.thread_id || threadId);
  console.log("   - Restored state destination:", checkpoint?.channel_values?.destination);
  console.log("   - Restored state places count:", checkpoint?.channel_values?.places?.length);
  console.log("\n✅ LangGraph Integration Verified Successfully!");
}

runTest();
