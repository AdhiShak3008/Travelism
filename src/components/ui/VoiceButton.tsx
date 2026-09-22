"use client";

import { motion } from "framer-motion";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface VoiceButtonProps {
  /** Current text inside the bound text box / textarea */
  value?: string;
  /** Called IN REAL-TIME as words are spoken, streaming live text into the text box */
  onChange?: (text: string) => void;
  /** Called when speaking finishes to automatically submit / launch the action */
  onSubmit?: (text: string) => void;
  /** Whether to automatically submit after silence / done (default true) */
  autoSubmit?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
  /** Backwards compatibility props */
  onSpeechResult?: (text: string) => void;
  onAutoSubmit?: (text: string) => void;
}

export function VoiceButton({
  value = "",
  onChange,
  onSubmit,
  autoSubmit = true,
  className = "",
  size = "md",
  title,
  onSpeechResult,
  onAutoSubmit,
}: VoiceButtonProps) {
  const handleLiveText = (live: string) => {
    onChange?.(live);
    onSpeechResult?.(live);
  };

  const handleFinishSubmit = (final: string) => {
    onChange?.(final);
    onSpeechResult?.(final);
    onSubmit?.(final);
    onAutoSubmit?.(final);
  };

  const {
    isListening,
    isTranscribing,
    recordingSeconds,
    error,
    toggleListening,
    stopListening,
  } = useVoiceInput({
    initialText: value,
    onLiveText: handleLiveText,
    onFinalText: handleLiveText,
    onAutoSubmit: handleFinishSubmit,
    autoSubmit,
    silenceTimeoutMs: 1800,
  });

  const sizeClasses = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
  }[size];

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];

  // Active or transcribing mode: expands into a dedicated, inline recording capsule in the normal DOM flow
  if (isListening || isTranscribing) {
    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-md backdrop-blur-md transition-all ${
            isTranscribing
              ? "border-brand/40 bg-brand/10 text-brand"
              : "border-rose-500/40 bg-paper-1/95 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20"
          }`}
        >
          {isTranscribing ? (
            <>
              {/* Spinner */}
              <svg
                className="h-4 w-4 animate-spin text-brand"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-xs font-semibold text-brand">Transcribing…</span>
            </>
          ) : (
            <>
              {/* Recording indicator */}
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>

              {/* Live Audio Equalizer Waveform */}
              <div className="flex items-center gap-0.5 h-3.5 px-0.5">
                {[8, 14, 16, 12, 6].map((maxH, i) => (
                  <motion.span
                    key={i}
                    className="w-0.5 rounded-full bg-rose-500"
                    animate={{ height: [3, maxH, 4, maxH * 0.7, 3] }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>

              {/* Status text & timer */}
              <span className="text-xs font-semibold whitespace-nowrap">
                {recordingSeconds > 0 ? `0:0${recordingSeconds}` : "Listening…"}
              </span>

              {/* Done/Stop Action */}
              <button
                type="button"
                onClick={() => stopListening(true)}
                className="ml-1 rounded-lg bg-rose-500 hover:bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs transition active:scale-95"
                title="Finish recording and auto-enter"
              >
                {autoSubmit ? "Done ↵" : "Stop"}
              </button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  // Normal Idle Button
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleListening();
        }}
        className={`relative flex items-center justify-center rounded-xl border border-line bg-paper-2/90 text-ink-soft hover:border-brand/40 hover:bg-paper-3 hover:text-brand transition-all duration-200 active:scale-95 shrink-0 ${sizeClasses}`}
        title={title ?? (autoSubmit ? "Speak to type (Appears live & auto-submits)" : "Speak to type")}
        aria-label="Voice input"
      >
        <svg
          className={`relative z-10 ${iconSizes}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"
          />
        </svg>
      </button>

      {/* Error alert badge if mic fails */}
      {error && (
        <div className="absolute bottom-full mb-1 left-0 z-50 whitespace-nowrap rounded-lg border border-red-500/30 bg-paper-1 px-2.5 py-1 text-[11px] font-medium text-red-600 shadow-md">
          {error}
        </div>
      )}
    </div>
  );
}
