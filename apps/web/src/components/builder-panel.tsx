"use client";
import { RevisionPanel } from "./revision-panel";
import { useEffect, useState } from "react";
import {
  builderJobSchema,
  getSpecification,
  sameSpecification,
  type BuilderJob,
  type Project,
} from "@app-factory/schemas";
import { useProjects } from "./project-provider";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Badge } from "./ui/badge";
const labels = {
  pending: "Bekliyor",
  running: "Üretiliyor / kontrol ediliyor",
  ready: "Kontroller geçti",
  failed: "Durduruldu",
};
export function BuilderPanel({ project }: { project: Project }) {
  const [job, setJob] = useState<BuilderJob | null>(null);
  const [history, setHistory] = useState<BuilderJob[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const { syncImageCost, syncBuilder } = useProjects();
  const revision = getSpecification(project).revision;
  useEffect(() => {
    let disposed = false;
    async function refresh() {
      try {
        const response = await fetch(`/api/builder?projectId=${project.id}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Builder bilgisi alınamadı.");
        const jobs: BuilderJob[] = (data.jobs ?? []).map((j: unknown) =>
          builderJobSchema.parse(j),
        );
        if (disposed) return;
        const current =
          jobs.find(
            (j) =>
              !j.change && getSpecification(j.project).revision === revision,
          ) ?? null;
        setJob(current);
        setHistory(jobs.filter((j) => j.id !== current?.id));
        setEnabled(data.enabled === true);
        setLoaded(true);
        setError("");
        syncImageCost(project.id, data.totalCostUsd);
        if (current) syncBuilder(current);
      } catch (e) {
        if (!disposed) {
          setError(e instanceof Error ? e.message : "Bağlantı kurulamadı.");
          setLoaded(false);
        }
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [project.id, revision, syncImageCost, syncBuilder]);
  async function start() {
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: { ...project, revisions: [] },
          retry: job?.status === "failed",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Builder başlatılamadı.");
      setJob(builderJobSchema.parse(data.job));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Builder başlatılamadı.");
    } finally {
      setSending(false);
    }
  }
  const stale = job && !sameSpecification(project, job.project);
  const exhausted =
    job?.tasks.some((t) => t.status !== "ready" && t.attempts >= 3) ||
    (job && !job.installed && job.setupAttempts >= 3);
  const busy = job?.status === "running";
  return (
    <div className="space-y-5">
      <RevisionPanel
        project={project}
        sourceJobId={job?.status === "ready" && !stale ? job.id : null}
      />
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Görselden Expo uygulamasına</CardTitle>
          <CardDescription>
            Onayladığınız her ekran ayrı bir AI göreviyle kodlanır. TypeScript
            ve ESLint her ekranın ardından çalışır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ekran başına en fazla $0.24; her denemede $0.08 bütçe ayrılır.
            Hatalı görevlerde otomatik tekrar yapılmaz; en fazla iki kez yeniden
            deneyebilirsiniz.
          </p>
          <p className="text-sm text-muted-foreground">
            Bu sürüm ekran tasarımı ve mevcut yerel kayıt işlemlerini kapsar.
            Gerçek hesap, sunucu bağlantısı ve plandaki diğer entegrasyonlar
            henüz tamamlanmış sayılmaz.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {job?.error && (
            <p role="alert" className="text-sm text-destructive">
              {job.error}
            </p>
          )}
          {stale && (
            <p className="text-sm text-destructive">
              Bu çıktı eski içeriğe ait. Güncel tasarımı onaylayın.
            </p>
          )}
          {!enabled && loaded && (
            <p className="text-sm">
              Worker .env dosyasında OPENAI_API_KEY gerekli.
            </p>
          )}
          <Button
            disabled={
              !loaded ||
              !enabled ||
              sending ||
              busy ||
              job?.status === "ready" ||
              !!exhausted ||
              !!stale
            }
            onClick={() => void start()}
          >
            {sending
              ? "Başlatılıyor…"
              : busy
                ? "Ekranlar hazırlanıyor…"
                : job?.status === "ready"
                  ? "Expo kod kontrolleri tamamlandı"
                  : job?.status === "failed"
                    ? "Başarısız görevden devam et"
                    : "Onaylı tasarımları kodla"}
          </Button>
          {job && (
            <p className="text-xs text-muted-foreground">
              {job.tasks.filter((t) => t.status === "ready").length}/
              {job.tasks.length} ekran · Builder maliyeti: $
              {job.tasks.reduce((n, t) => n + t.costUsd, 0).toFixed(6)} ·
              Ayrılan / belirsiz: $
              {job.tasks
                .reduce((n, t) => n + t.reservedUsd + t.uncertainCostUsd, 0)
                .toFixed(6)}
            </p>
          )}
        </CardContent>
      </Card>
      {job?.tasks.map((task) => (
        <Card key={task.screenId} className="shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{task.name}</CardTitle>
              <Badge variant="secondary">{labels[task.status]}</Badge>
            </div>
            <CardDescription>
              Deneme {task.attempts}/3 · ${task.costUsd.toFixed(6)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.summary && <p className="text-sm">{task.summary}</p>}
            {task.limitations.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {task.limitations.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            {task.log && (
              <details>
                <summary className="cursor-pointer text-sm">
                  Kontrol çıktısı
                </summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded border p-3 text-xs">
                  {task.log}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      ))}
      {job?.setupLog && (
        <details>
          <summary className="cursor-pointer text-sm">Expo kurulumu</summary>
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-xs">
            {job.setupLog}
          </pre>
        </details>
      )}
      {job?.status === "ready" && !stale && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Önizlemeye hazır</CardTitle>
            <CardDescription>
              Kod kontrolleri geçti. Görsel uyumu ve cihaz davranışını
              önizlemede inceleyin; ardından EAS bölümünden APK
              oluşturabilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded border p-4 text-sm">{`cd "${job.outputPath}"\nnpm start\n# Tarayıcı önizlemesi için: npm run web`}</pre>
          </CardContent>
        </Card>
      )}
      {history.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm">
            Önceki sürümlerin çıktıları
          </summary>
          {history.map((j) => (
            <p key={j.id} className="mt-2 break-all text-xs">
              Sürüm {getSpecification(j.project).revision} ·{" "}
              {j.outputPath || "Çıktı oluşturulmadı"}
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
