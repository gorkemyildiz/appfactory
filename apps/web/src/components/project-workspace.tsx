"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  ListChecks,
  PanelsTopLeft,
  Palette,
  Code2,
  FlaskConical,
  Package,
  Smartphone,
} from "lucide-react";
import { useProjects } from "@/components/project-provider";
import { Loading, BackToDashboard } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { stageLabels } from "@app-factory/shared";
import { cn } from "@/lib/utils";
const links = [
  { name: "Genel Bakış", slug: "", icon: LayoutDashboard },
  { name: "Plan", slug: "/plan", icon: ListChecks },
  { name: "Ekranlar", slug: "/screens", icon: PanelsTopLeft },
  { name: "Tasarım", slug: "/design", icon: Palette },
  { name: "Geliştirme", slug: "/development", icon: Code2 },
  { name: "Testler", slug: "/tests", icon: FlaskConical },
  { name: "Derleme", slug: "/build", icon: Package },
];
export function ProjectWorkspace({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const path = usePathname();
  const { projects, ready } = useProjects();
  if (!ready) return <Loading />;
  const project = projects.find((p) => p.id === id);
  if (!project)
    return (
      <div className="py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Proje bulunamadı</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Bu proje bu tarayıcıda kayıtlı değil.
        </p>
        <BackToDashboard />
      </div>
    );
  return (
    <>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground"
      >
        <ArrowLeft size={14} />
        Tüm projeler
      </Link>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="rounded-lg border bg-white p-3">
          <Smartphone size={22} />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Mobil Uygulama ·{" "}
            {[project.android && "Android", project.ios && "iOS"]
              .filter(Boolean)
              .join(" + ")}
          </p>
        </div>
        <Badge variant="outline" className="sm:ml-auto">
          {stageLabels[project.stage]}
        </Badge>
      </div>
      <div className="grid items-start gap-7 md:grid-cols-[180px_minmax(0,1fr)]">
        <aside>
          <nav
            aria-label="Proje menüsü"
            className="flex gap-1 overflow-x-auto pb-2 md:flex-col"
          >
            {links.map(({ name, slug, icon: Icon }) => {
              const href = `/projects/${id}${slug}`;
              return (
                <Link
                  key={name}
                  href={href}
                  aria-current={path === href ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm",
                    path === href
                      ? "bg-neutral-200/70 font-medium"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon size={16} />
                  {name}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 hidden border-t pt-4 text-xs leading-5 text-muted-foreground md:block">
            Proje bütçesi
            <div className="mt-1 text-sm font-medium text-foreground">
              ${project.aiCost.toFixed(2)}{" "}
              <span className="font-normal text-muted-foreground">
                / ${project.budgetLimit.toFixed(2)}
              </span>
            </div>
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </>
  );
}
