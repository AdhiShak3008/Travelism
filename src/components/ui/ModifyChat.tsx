"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";

interface Msg {
  role: "user" | "concierge";
  text: string;
  deltas?: string[];
}

const QUICK = [
  "Make the hotel nicer",
  "A bit cheaper, please",
  "Add one more day",
  "I hate early flights",
  "Make it more relaxed",
];

export function ModifyChat() {
  const applyInstruction = useTrip((s) => s.applyInstruction);
  const [text, setText] = useState("");
  const [log, setLog] = useState<Msg[]>([
    { role: "concierge", text: "Here's your trip. Tell me anything you'd like to change — I'll only touch what's needed." },
  ]);
  const scroller = useRef<HTMLDivElement>(null);

  function send(instruction: string) {
    if (!instruction.trim()) return;
    setLog((l) => [...l, { role: "user", text: instruction }]);
    applyInstruction(instruction);
    setText("");
    setTimeout(() => {
      const latest = useTrip.getState().blob.mutations[0];
      const msg = useTrip.getState().lastMessage;
      setLog((l) => [...l, { role: "concierge", text: msg ?? latest?.summary ?? "Done.", deltas: latest?.deltas }]);
    }, 120);
  }

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span>💬</span>
        <span className="text-sm font-semibold text-ink">Ask for changes</span>
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
        {log.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3.5 py-2.5 text-sm text-paper"
                  : "max-w-[90%] rounded-2xl rounded-bl-sm border border-line bg-paper-2 px-3.5 py-2.5 text-sm text-ink"
              }
            >
              <p>{m.text}</p>
              {m.deltas && m.deltas.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-line pt-2">
                  {m.deltas.map((d, j) => (
                    <div key={j} className="text-xs text-brand">· {d}</div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="border-t border-line p-3">
        <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
          {QUICK.map((q) => (
            <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-line-strong bg-paper-2 px-3 py-1 text-xs text-ink-soft hover:text-ink">
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(text)}
            placeholder="e.g. Keep the hotel but make the trip cheaper"
            className="flex-1 rounded-full border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint/70 focus:border-brand/50"
          />
          <button onClick={() => send(text)} disabled={!text.trim()} className="btn-primary !px-4 !py-2.5">Send</button>
        </div>
      </div>
    </div>
  );
}
