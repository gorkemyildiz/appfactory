"use client";
import { Progress } from "./ui/progress";
import type { BuilderJob } from "@app-factory/schemas";
export function builderProgress(job: BuilderJob | null) {
  if (!job) return { value: 0, label: "İstek gönderiliyor…" };
  const done = job.tasks.filter((task) => task.status === "ready").length;
  const total = job.tasks.length + 1;
  return {
    value:
      job.status === "ready"
        ? 100
        : Math.min(
            99,
            Math.round(((Number(job.installed) + done) / total) * 100),
          ),
    label:
      job.status === "ready"
        ? "Kod üretimi ve kontroller tamamlandı."
        : job.status === "failed"
          ? "İşlem durduruldu; tamamlanan adımlar korundu."
          : !job.installed
            ? "Expo projesi ve bağımlılıklar hazırlanıyor…"
            : (job.tasks.find((task) => task.status === "running")?.name ??
                "Son kontroller") + " · Kod üretiliyor ve doğrulanıyor…",
  };
}
export function OperationProgress({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail?: string;
}) {
  return (
    <div className="w-full space-y-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="shrink-0 tabular-nums">%{value}</span>
      </div>
      <Progress value={value} aria-label={label} />
      <p className="text-xs text-muted-foreground">
        {detail ??
          "Tamamlanan işlem adımlarına göre hesaplanır; süre tahmini değildir."}
      </p>
    </div>
  );
}
