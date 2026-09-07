"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { MediaImage } from "@/lib/types";

interface LightboxState {
  open: (images: MediaImage[], index?: number, title?: string) => void;
}

const Ctx = createContext<LightboxState | null>(null);

export function useLightbox(): LightboxState {
  const ctx = useContext(Ctx);
  // no-op fallback if provider missing
  return ctx ?? { open: () => {} };
}

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [images, setImages] = useState<MediaImage[]>([]);
  const [index, setIndex] = useState(0);
  const [title, setTitle] = useState<string | undefined>();
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((imgs: MediaImage[], i = 0, t?: string) => {
    if (!imgs.length) return;
    setImages(imgs);
    setIndex(i);
    setTitle(t);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);
  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close, next, prev]);

  const current = images[index];

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <AnimatePresence>
        {isOpen && current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4 backdrop-blur"
            onClick={close}
          >
            <button className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20" onClick={close}>
              ×
            </button>
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                >
                  ‹
                </button>
                <button
                  className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); next(); }}
                >
                  ›
                </button>
              </>
            )}
            <motion.div
              key={current.id}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="relative max-h-[86vh] w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-[3/2] max-h-[80vh] overflow-hidden rounded-xl">
                <Image src={current.url} alt={title ?? current.category} fill sizes="90vw" className="object-contain" unoptimized />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-white/80">
                <span>{title ? `${title} · ` : ""}{current.category}{current.credit ? ` · ${current.credit}` : ""}</span>
                {images.length > 1 && <span>{index + 1} / {images.length}</span>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
