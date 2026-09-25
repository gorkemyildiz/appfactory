"use client";
import { useEffect, useState } from "react";
import {
  releaseChecklistSchema,
  type ReleaseChecklist,
  type Project,
} from "@app-factory/schemas";
export function ReleaseChecklistPanel({
  project,
  sourceJobId,
  approved,
  onReady,
}: {
  project: Project;
  sourceJobId: string;
  approved: boolean;
  onReady: (ready: boolean) => void;
}) {
  const [state, setState] = useState<ReleaseChecklist | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const snapshot = JSON.stringify({ ...project, revisions: [] });
  useEffect(() => {
    let closed = false;
    onReady(false);
    async function load() {
      try {
        const response = await fetch("/api/eas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "checklist",
            project: JSON.parse(snapshot),
            sourceJobId,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Liste alınamadı.");
        const next = releaseChecklistSchema.parse(data.checklist);
        if (!closed) {
          setState(next);
          onReady(next.ready);
        }
      } catch (e) {
        if (!closed) {
          setError(e instanceof Error ? e.message : "Liste alınamadı.");
          onReady(false);
        }
      }
    }
    void load();
    return () => {
      closed = true;
    };
  }, [snapshot, sourceJobId, onReady]);
  async function toggle(itemId: string, checked: boolean) {
    if (!state || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/eas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check-item",
          project: JSON.parse(snapshot),
          sourceJobId,
          fingerprint: state.fingerprint,
          itemId,
          checked,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kontrol kaydedilemedi.");
      const next = releaseChecklistSchema.parse(data.checklist);
      setState(next);
      onReady(next.ready);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kontrol kaydedilemedi.");
      onReady(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset
      disabled={!approved || busy}
      className="space-y-3 rounded-md border p-3"
    >
      <legend className="px-1 text-sm font-medium">Tamamlama listesi</legend>
      <p className="text-xs text-muted-foreground">
        Önizleme onayından sonra denediğiniz maddeleri işaretleyin. Demo veriler
        gerçek bağlantı kurulmuş sayılmaz. Kod veya bağlantı değişince yeniden
        kontrol gerekir.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {state?.items.map((item) => (
        <label key={item.id} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => void toggle(item.id, e.target.checked)}
          />
          {item.label}
        </label>
      ))}
      {state && (
        <p className="text-xs">
          {state.items.filter((i) => i.checked).length} / {state.items.length}{" "}
          tamamlandı
        </p>
      )}
    </fieldset>
  );
}
