"use client";
import { useState } from "react";
import Link from "next/link";
import {
  getSpecification,
  getScreens,
  planSchema,
  designSchema,
  type Project,
  type SpecificationSection,
} from "@app-factory/schemas";
import { useProjects } from "@/components/project-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobilePreview } from "@/components/mobile-preview";
import { Badge } from "@/components/ui/badge";
export function SpecificationEditor({
  project,
  section,
}: {
  project: Project;
  section: Exclude<SpecificationSection, "screens">;
}) {
  const [spec, setSpec] = useState(() => getSpecification(project));
  const stale = getSpecification(project).revision !== spec.revision;
  const { editSpecification, advance, approveDesign } = useProjects();
  const [summary, setSummary] = useState(spec.plan.summary);
  const [scope, setScope] = useState(spec.plan.scope.join("\n"));
  const [outOfScope, setOutOfScope] = useState(spec.plan.outOfScope);
  const [design, setDesign] = useState(spec.design);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [review, setReview] = useState<{
    key: string;
    screens: string[];
  } | null>(null);
  const previewKey = JSON.stringify({
    revision: spec.revision,
    design,
    summary: spec.plan.summary,
    screens: getScreens(spec),
  });
  const reviewed =
    review?.key === previewKey &&
    getScreens(spec)
      .filter((s) => s.enabled)
      .every((s) => review.screens.includes(s.id));
  const plan = {
    summary,
    scope: scope
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    outOfScope,
  };
  const dirty =
    section === "plan"
      ? JSON.stringify(plan) !== JSON.stringify(spec.plan)
      : JSON.stringify(design) !== JSON.stringify(spec.design);
  const save = () => {
    const parsed =
      section === "plan"
        ? planSchema.safeParse(plan)
        : designSchema.safeParse(design);
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(" "));
      return;
    }
    try {
      const savedSpec = editSpecification(
        project.id,
        section,
        parsed.data,
        spec.revision,
      );
      setSpec(savedSpec);
      setSummary(savedSpec.plan.summary);
      setScope(savedSpec.plan.scope.join("\n"));
      setOutOfScope(savedSpec.plan.outOfScope);
      setDesign(savedSpec.design);
      setError(null);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Değişiklikler kaydedilemedi.");
    }
  };
  const changeDesign = (key: keyof typeof design, value: string) => {
    setDesign({
      ...design,
      [key]: key === "radius" || key === "spacing" ? Number(value) : value,
    });
  };
  const approved =
    [
      "idea",
      "plan",
      "screens",
      "design",
      "development",
      "tests",
      "build",
    ].indexOf(project.stage) >
    ["idea", "plan", "screens", "design"].indexOf(section);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {section === "plan" ? "Plan" : "Tasarım"}
        </h2>
        <Badge variant="outline">Sürüm {spec.revision}</Badge>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {section === "plan"
          ? "Proje özetini, ilk sürüm kapsamını ve kapsam dışında kalanları düzenleyin. Plan üretim belleğine aktarılır; kapsam maddeleri henüz otomatik özellik koduna dönüşmez."
          : "Bu değerler üretilen Expo uygulamasının renklerine, köşe yuvarlaklığına ve ekran boşluklarına uygulanır."}
      </p>
      {stale && (
        <p role="alert" className="rounded border border-amber-300 p-3 text-sm">
          Başka bir sekmede daha yeni sürüm kaydedildi. Açık düzenlemeniz
          korunuyor; kaydetmeden önce güncel sürümü yükleyin.
        </p>
      )}
      {section === "design" && (
        <MobilePreview
          key={previewKey}
          project={project}
          specification={{
            ...spec,
            design: designSchema.safeParse(design).success
              ? design
              : spec.design,
          }}
          canReview={!dirty && !stale}
          onReview={(screens) => setReview({ key: previewKey, screens })}
        />
      )}
      <Card className="shadow-none">
        <CardContent className="space-y-5 pt-6">
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            {section === "plan" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="plan-summary">Proje özeti</Label>
                  <Textarea
                    id="plan-summary"
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    className="min-h-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-scope">
                    İlk sürüm kapsamı (her satıra bir madde)
                  </Label>
                  <Textarea
                    id="plan-scope"
                    value={scope}
                    onChange={(event) => setScope(event.target.value)}
                    className="min-h-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-exclusions">
                    Kapsam dışında kalanlar
                  </Label>
                  <Textarea
                    id="plan-exclusions"
                    value={outOfScope}
                    onChange={(event) => setOutOfScope(event.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  {(["background", "text", "primary"] as const).map((key) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>
                        {
                          {
                            background: "Arka plan rengi",
                            text: "Metin rengi",
                            primary: "Ana renk",
                          }[key]
                        }
                      </Label>
                      <Input
                        id={key}
                        value={design[key]}
                        onChange={(event) =>
                          changeDesign(key, event.target.value)
                        }
                        maxLength={7}
                      />
                      <div
                        className="h-10 rounded border"
                        style={{
                          backgroundColor: /^#[\da-f]{6}$/i.test(design[key])
                            ? design[key]
                            : undefined,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="radius">Köşe yuvarlaklığı (0–24 px)</Label>
                    <Input
                      id="radius"
                      type="number"
                      min={0}
                      max={24}
                      value={design.radius}
                      onChange={(event) =>
                        changeDesign("radius", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spacing">Ekran boşluğu (8–32 px)</Label>
                    <Input
                      id="spacing"
                      type="number"
                      min={8}
                      max={32}
                      value={design.spacing}
                      onChange={(event) =>
                        changeDesign("spacing", event.target.value)
                      }
                    />
                  </div>
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {saved && !dirty && (
              <p role="status" className="text-sm">
                Değişiklikler kaydedildi.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <Button type="submit" disabled={!dirty}>
                Değişiklikleri kaydet
              </Button>
              {(dirty || stale) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const latest = getSpecification(project);
                    setSpec(latest);
                    setSummary(latest.plan.summary);
                    setScope(latest.plan.scope.join("\n"));
                    setOutOfScope(latest.plan.outOfScope);
                    setDesign(latest.design);
                    setError(null);
                  }}
                >
                  {stale ? "Güncel sürümü yükle" : "Değişiklikleri geri al"}
                </Button>
              )}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Kaydetmek yeni sürüm oluşturur. Bu adımın ve sonraki adımların
              onayları yenilenmelidir. Önceki üretim klasörleri korunur.
              Düzenlemeyi bitirip bu sayfadan ayrılmadan önce kaydedin.
            </p>
          </form>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
        <span className="text-sm text-muted-foreground">
          {dirty
            ? "Kaydedilmemiş değişiklikler var."
            : approved
              ? "Bu sürümün bu adımı onaylandı."
              : section === "design"
                ? "Onaydan önce seçilen tüm ekranları inceleyip işaretleyin."
                : "İçeriği inceleyip onaylayın."}
        </span>
        {project.stage === section ? (
          <Button
            disabled={dirty || stale || (section === "design" && !reviewed)}
            onClick={() => {
              try {
                if (section === "design")
                  approveDesign(
                    project.id,
                    review?.screens ?? [],
                    spec.revision,
                  );
                else advance(project.id, "APPROVE_PLAN");
                setError(null);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Onay kaydedilemedi.",
                );
              }
            }}
          >
            {section === "plan" ? "Planı onayla" : "Tasarımı onayla"}
          </Button>
        ) : approved && !dirty && !stale ? (
          <Button variant="outline" asChild>
            <Link
              href={`/projects/${project.id}/${section === "plan" ? "screens" : "development"}`}
            >
              Sonraki adıma git
            </Link>
          </Button>
        ) : null}
      </div>
      {!!project.revisions?.length && (
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Sürüm geçmişi ({project.revisions.length} kayıt)
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Son 20 önceki sürüm saklanır. Geçmiş salt okunurdur.
          </p>
          <div className="mt-4 space-y-3">
            {[...project.revisions].reverse().map((revision) => (
              <details
                key={revision.specification.revision}
                className="rounded border p-3"
              >
                <summary className="cursor-pointer text-sm">
                  Sürüm {revision.specification.revision} ·{" "}
                  {
                    { plan: "Plan", screens: "Ekranlar", design: "Tasarım" }[
                      revision.changedSection
                    ]
                  }{" "}
                  değişikliği öncesi ·{" "}
                  {new Date(revision.savedAt).toLocaleString("tr-TR")}
                </summary>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p className="whitespace-pre-wrap">
                    {revision.specification.plan.summary}
                  </p>
                  <ul className="list-inside list-disc">
                    {revision.specification.plan.scope.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                  <p>
                    Kapsam dışı:{" "}
                    {revision.specification.plan.outOfScope || "Belirtilmedi"}
                  </p>
                  <p>
                    Arka plan: {revision.specification.design.background} ·
                    Metin: {revision.specification.design.text} · Ana renk:{" "}
                    {revision.specification.design.primary}
                  </p>
                  <p>
                    Ekranlar:{" "}
                    {getScreens(revision.specification)
                      .filter((s) => s.enabled)
                      .map((s) => s.name)
                      .join(", ")}
                  </p>
                  <p>
                    Köşe: {revision.specification.design.radius} px · Boşluk:{" "}
                    {revision.specification.design.spacing} px
                  </p>
                </div>
              </details>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
