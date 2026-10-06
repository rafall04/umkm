"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl sm:left-auto">
      <span className="text-2xl">📲</span>
      <div className="flex-1 text-sm">
        <p className="font-semibold">Pasang Aplikasi</p>
        <p className="text-stone-500">Akses pasar UMKM lebih cepat dari layar utama.</p>
      </div>
      <button
        onClick={async () => {
          await deferred.prompt();
          setDeferred(null);
        }}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
      >
        Pasang
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-sm text-stone-400"
        aria-label="Tutup"
      >
        ✕
      </button>
    </div>
  );
}
