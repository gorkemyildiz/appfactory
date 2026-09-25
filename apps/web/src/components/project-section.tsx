"use client";
import Link from "next/link";
import { BuilderPanel } from "@/components/builder-panel";
import { DesignGallery } from "@/components/design-gallery";
import { PlannerPanel } from "@/components/planner-panel";
import { ScreenEditor } from "@/components/screen-editor";
import { SpecificationEditor } from "@/components/specification-editor";
import { GenerationPanel } from "@/components/generation-panel";
import { useParams } from "next/navigation";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { useProjects } from "@/components/project-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { progress, stageLabels, stages } from "@app-factory/shared";
import { type Stage } from "@app-factory/schemas";
type Section = "overview" | Exclude<Stage, "idea">;
export function ProjectSection({ section }: { section: Section }) {
  const { id } = useParams<{ id: string }>();
  const { projects, advance } = useProjects();
  const project = projects.find((p) => p.id === id);
  if (!project) return null;
  const index = stages.indexOf(project.stage);
  const header = (title: string, description: string) => (
    <div className="mb-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
  if (section === "overview")
    return (
      <>
        {header(
          "Genel Bakış",
          "Projenizin mevcut durumu ve bir sonraki adımı.",
        )}
        <Card className="mb-5 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Proje fikri</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {project.idea}
            </p>
          </CardContent>
        </Card>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          {[
            ["Mevcut aşama", stageLabels[project.stage]],
            ["Yapay zekâ maliyeti", `$${project.aiCost.toFixed(2)}`],
            ["Bütçe limiti", `$${project.budgetLimit.toFixed(2)}`],
          ].map(([label, value]) => (
            <Card key={label} className="gap-2 p-5 shadow-none">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold">{value}</p>
            </Card>
          ))}
        </div>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Proje akışı</CardTitle>
            <CardDescription>
              Plan, ekran ve tasarım onaylarından sonra Expo projesi üretilir ve
              gerçek kontroller çalışır.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={progress(project.stage)}
              aria-label="Proje akışı ilerlemesi"
              className="mb-5 h-1.5"
            />
            <div className="space-y-4">
              {stages.map((stage, i) => (
                <div key={stage} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full border text-xs ${i === index ? "border-foreground bg-foreground text-white" : "text-muted-foreground"}`}
                  >
                    {i < index ? <Check size={12} /> : i + 1}
                  </span>
                  <span className={i > index ? "text-muted-foreground" : ""}>
                    {stage === "idea" ? "Fikir" : stageLabels[stage]}
                  </span>
                  {i === index && (
                    <Badge variant="secondary" className="ml-auto">
                      Mevcut
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 border-t pt-5">
              {project.stage === "idea" ? (
                <Button onClick={() => advance(id, "CREATE_PLAN")}>
                  Örnek plan oluştur
                  <ArrowRight />
                </Button>
              ) : (
                <Button asChild>
                  <Link href={`/projects/${id}/${project.stage}`}>
                    {stageLabels[project.stage]} aşamasına devam et
                    <ArrowRight />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </>
    );
  const minimum: Record<Exclude<Section, "overview">, number> = {
    plan: 1,
    screens: 2,
    design: 3,
    development: 4,
    tests: 4,
    build: 4,
  };
  if (index < minimum[section])
    return (
      <>
        {header(
          stageLabels[section],
          "Proje ilerledikçe bu adım kullanılabilir olacak.",
        )}
        <Card className="p-8 shadow-none">
          <LockKeyhole size={22} className="text-muted-foreground" />
          <h3 className="mt-4 font-medium">Önceki adımı tamamlayın</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {project.stage === "idea"
              ? "Genel bakış sayfasından örnek bir plan oluşturun."
              : `Devam etmeden önce mevcut aşamayı inceleyip onaylayın: ${stageLabels[project.stage]}.`}
          </p>
          <div className="mt-5">
            <Button variant="outline" asChild>
              <Link
                href={`/projects/${id}${project.stage === "idea" ? "" : `/${project.stage}`}`}
              >
                {project.stage === "idea"
                  ? "Genel Bakış"
                  : stageLabels[project.stage]}{" "}
                sayfasına git
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </Card>
      </>
    );
  if (section === "plan")
    return (
      <>
        <PlannerPanel key={project.id} project={project} />
        <SpecificationEditor
          key={project.id + ":plan:" + (project.plannerJobId ?? "local")}
          project={project}
          section="plan"
        />
      </>
    );
  if (section === "screens")
    return <ScreenEditor key={project.id} project={project} />;
  if (section === "design")
    return (
      <DesignGallery
        key={project.id + ":" + project.specification?.revision}
        project={project}
      />
    );
  if (project.designReview?.images?.length)
    return (
      <BuilderPanel
        key={project.id + ":" + project.specification?.revision}
        project={project}
      />
    );
  return <GenerationPanel project={project} section={section} />;
}
