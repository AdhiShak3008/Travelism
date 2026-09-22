"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VoiceInputOptions {
  /** Initial text in the box before speaking started */
  initialText?: string;
  /** Called IN REAL-TIME as words are spoken, streaming live text directly into the text box */
  onLiveText?: (text: string) => void;
  /** Called when a final chunk or finalized speech is confirmed */
  onFinalText?: (text: string) => void;
  /** Called when recording finishes and should auto-submit */
  onAutoSubmit?: (text: string) => void;
  /** Whether to automatically submit after silence */
  autoSubmit?: boolean;
  /** Milliseconds of silence to wait before auto-finishing (default 1800ms) */
  silenceTimeoutMs?: number;
}

export function useVoiceInput({
  initialText = "",
  onLiveText,
  onFinalText,
  onAutoSubmit,
  autoSubmit = false,
  silenceTimeoutMs = 1800,
}: VoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // References
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const liveStreamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Session state trackers
  const isActivelyListeningRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const baseTextRef = useRef("");
  const accumulatedFinalRef = useRef("");
  const latestLiveWhisperTextRef = useRef("");
  const chunksRef = useRef<Blob[]>([]);
  const isRequestInFlightRef = useRef(false);
  const isUsingWhisperStreamRef = useRef(false);

  // Synchronized callback refs
  const onLiveTextRef = useRef(onLiveText);
  onLiveTextRef.current = onLiveText;
  const onFinalTextRef = useRef(onFinalText);
  onFinalTextRef.current = onFinalText;
  const onAutoSubmitRef = useRef(onAutoSubmit);
  onAutoSubmitRef.current = onAutoSubmit;
  const autoSubmitRef = useRef(autoSubmit);
  autoSubmitRef.current = autoSubmit;
  const initialTextRef = useRef(initialText);
  initialTextRef.current = initialText;

  // Cleanup all timers and media streams
  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (liveStreamIntervalRef.current) {
      clearInterval(liveStreamIntervalRef.current);
      liveStreamIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      isActivelyListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      cleanup();
    };
  }, [cleanup]);

  // Finish session, deliver final text, and trigger auto-submit if enabled
  const finishSession = useCallback(
    async (triggerSubmit = true) => {
      isActivelyListeningRef.current = false;
      setIsListening(false);

      if (liveStreamIntervalRef.current) {
        clearInterval(liveStreamIntervalRef.current);
        liveStreamIntervalRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      // If we used the MediaRecorder live stream, finalize with complete audio pass
      if (isUsingWhisperStreamRef.current && mediaRecorderRef.current) {
        const recorder = mediaRecorderRef.current;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {}
        }

        cleanup();

        // If we collected audio chunks, make a fast final transcription pass
        if (chunksRef.current.length > 0) {
          setIsTranscribing(true);
          try {
            const finalBlob = new Blob(chunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            });

            if (finalBlob.size > 1200) {
              const form = new FormData();
              form.append("file", finalBlob, "audio.webm");

              const res = await fetch("/api/transcribe", {
                method: "POST",
                body: form,
              });

              if (res.ok) {
                const data = await res.json();
                const clean = (data.text || "").trim();
                if (clean) {
                  latestLiveWhisperTextRef.current = clean;
                }
              }
            }
          } catch (e) {
            console.warn("[VoiceInput] Final transcribe pass failed:", e);
          } finally {
            setIsTranscribing(false);
          }
        }

        const finalText = [
          baseTextRef.current,
          latestLiveWhisperTextRef.current.trim(),
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        if (finalText) {
          onLiveTextRef.current?.(finalText);
          onFinalTextRef.current?.(finalText);

          if (triggerSubmit && autoSubmitRef.current && onAutoSubmitRef.current && hasSpokenRef.current) {
            setTimeout(() => {
              onAutoSubmitRef.current?.(finalText);
            }, 60);
          }
        }
        return;
      }

      cleanup();

      // Final string from native SpeechRecognition
      const finalText = [
        baseTextRef.current,
        accumulatedFinalRef.current.trim(),
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (finalText) {
        onLiveTextRef.current?.(finalText);
        onFinalTextRef.current?.(finalText);

        if (triggerSubmit && autoSubmitRef.current && onAutoSubmitRef.current && hasSpokenRef.current) {
          setTimeout(() => {
            onAutoSubmitRef.current?.(finalText);
          }, 60);
        }
      }
    },
    [cleanup]
  );

  // Live Streaming Whisper Engine: records chunks and transcribes cumulative audio every ~850ms
  const startLiveStreamingRecorder = useCallback(async () => {
    isUsingWhisperStreamRef.current = true;
    chunksRef.current = [];
    latestLiveWhisperTextRef.current = "";
    isRequestInFlightRef.current = false;

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported by your browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Web Audio Analyser for Silence Detection
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkSilence = () => {
          if (!analyserRef.current || !isActivelyListeningRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;

          if (avg > 12) {
            hasSpokenRef.current = true;
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else if (hasSpokenRef.current && autoSubmitRef.current) {
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                void finishSession(true);
              }, silenceTimeoutMs);
            }
          }

          animFrameRef.current = requestAnimationFrame(checkSilence);
        };
        animFrameRef.current = requestAnimationFrame(checkSilence);
      } catch (e) {
        console.warn("[VoiceInput] Analyser setup error:", e);
      }

      // MediaRecorder Setup
      let mimeType = "audio/webm;codecs=opus";
      if (typeof MediaRecorder !== "undefined") {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(300); // Deliver audio slices every 300ms
      setIsListening(true);

      // Cumulative Live Transcription Loop: sends audio every ~850ms so words stream live into the text box!
      liveStreamIntervalRef.current = setInterval(async () => {
        if (!isActivelyListeningRef.current) return;
        if (isRequestInFlightRef.current) return;
        if (!hasSpokenRef.current) return;
        if (chunksRef.current.length < 2) return;

        const currentCumulativeBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (currentCumulativeBlob.size < 2000) return;

        isRequestInFlightRef.current = true;
        try {
          const form = new FormData();
          form.append("file", currentCumulativeBlob, "audio.webm");

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: form,
          });

          if (res.ok && isActivelyListeningRef.current) {
            const data = await res.json();
            const text = (data.text || "").trim();
            if (text) {
              latestLiveWhisperTextRef.current = text;
              const liveCombined = baseTextRef.current
                ? `${baseTextRef.current} ${text}`.trim()
                : text;
              // Updates text box LIVE in real time!
              onLiveTextRef.current?.(liveCombined);
            }
          }
        } catch (err) {
          // Non-blocking interim transcription error
        } finally {
          isRequestInFlightRef.current = false;
        }
      }, 850);
    } catch (err: any) {
      console.warn("[VoiceInput] Live stream mic error:", err);
      cleanup();
      setIsListening(false);
      setError("Microphone access denied. Please allow microphone in browser.");
    }
  }, [cleanup, finishSession, silenceTimeoutMs]);

  // Start Voice Session
  const startListening = useCallback(async () => {
    if (isListening || isTranscribing) return;
    setError(null);
    hasSpokenRef.current = false;
    accumulatedFinalRef.current = "";
    latestLiveWhisperTextRef.current = "";
    isUsingWhisperStreamRef.current = false;
    setRecordingSeconds(0);
    isActivelyListeningRef.current = true;

    // Freeze existing text in textbox at the EXACT moment recording starts
    baseTextRef.current = initialTextRef.current.trim();

    // Start duration timer
    const startTime = Date.now();
    durationTimerRef.current = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 500);

    // Check for native SpeechRecognition (instant sub-50ms live streaming in Chrome/Edge/Safari)
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        let hasError = false;

        recognition.onresult = (event: any) => {
          let sessionFinal = "";
          let sessionInterim = "";

          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              sessionFinal += (sessionFinal ? " " : "") + res[0].transcript.trim();
            } else {
              sessionInterim += (sessionInterim ? " " : "") + res[0].transcript.trim();
            }
          }

          accumulatedFinalRef.current = sessionFinal;

          // Real-time live update directly into the textbox as the user speaks!
          const liveSessionSpeech = [sessionFinal, sessionInterim].filter(Boolean).join(" ").trim();
          const combined = baseTextRef.current
            ? `${baseTextRef.current} ${liveSessionSpeech}`.trim()
            : liveSessionSpeech;

          if (combined) {
            onLiveTextRef.current?.(combined);
          }

          // Reset silence timer on speech
          hasSpokenRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          if (autoSubmitRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              void finishSession(true);
            }, silenceTimeoutMs);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("[VoiceInput] SpeechRecognition error:", event.error);
          // If browser speech service is blocked (Brave Shields / network error / not-allowed)
          if (
            event.error === "network" ||
            event.error === "not-allowed" ||
            event.error === "service-not-allowed" ||
            event.error === "audio-capture"
          ) {
            hasError = true;
            try {
              recognition.stop();
            } catch {}
            console.log("[VoiceInput] Switching to Groq Whisper cumulative live streaming...");
            void startLiveStreamingRecorder();
          } else if (event.error !== "no-speech") {
            setError(`Speech recognition: ${event.error}`);
          }
        };

        recognition.onend = () => {
          if (hasError) return;
          if (isActivelyListeningRef.current && !isUsingWhisperStreamRef.current) {
            if (hasSpokenRef.current && autoSubmitRef.current) {
              void finishSession(true);
            } else {
              try {
                recognition.start();
              } catch {}
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        return;
      } catch (e) {
        console.warn("[VoiceInput] SpeechRec init failed, using Groq fallback:", e);
      }
    }

    // Direct fallback for browsers without SpeechRecognition (Firefox, etc.)
    void startLiveStreamingRecorder();
  }, [
    isListening,
    isTranscribing,
    startLiveStreamingRecorder,
    finishSession,
    silenceTimeoutMs,
  ]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      void finishSession(true);
    } else {
      void startListening();
    }
  }, [isListening, startListening, finishSession]);

  return {
    isListening,
    isTranscribing,
    recordingSeconds,
    error,
    startListening,
    stopListening: finishSession,
    toggleListening,
  };
}
