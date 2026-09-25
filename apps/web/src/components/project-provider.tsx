"use client";
import { type BuilderJob } from "@app-factory/schemas";
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  projectInputSchema,
  applyPlannerResult,
  type PlannerJob,
  reviseProject,
  approveVisualDesign,
  getSpecification,
  type Specification,
  sameSpecification,
  type SpecificationSection,
  storedProjectsSchema,
  type Project,
  type ProjectInput,
  type GenerationJob,
} from "@app-factory/schemas";
import {
  mockProjects,
  transition,
  type WorkflowEvent,
} from "@app-factory/shared";
const KEY = "app-factory.projects.v1";
type Snapshot = { projects: Project[]; ready: boolean; error: string | null };
type Store = Snapshot & {
  applyImageApproval: (project: Project, expectedRevision: number) => void;
  syncImageCost: (id: string, cost: number) => void;
  applyPlanner: (job: PlannerJob) => void;
  syncPlannerCost: (job: PlannerJob) => void;
  approveDesign: (
    id: string,
    screens: readonly string[],
    revision: number,
  ) => void;
  create: (input: ProjectInput) => string;
  advance: (id: string, event: WorkflowEvent) => void;
  syncGeneration: (job: GenerationJob) => void;
  syncBuilder: (job: BuilderJob) => void;
  syncPreview: (project: Project) => void;
  editSpecification: (
    id: string,
    section: SpecificationSection,
    input: unknown,
    expectedRevision: number,
  ) => Specification;
};
const empty: Snapshot = { projects: [], ready: false, error: null };
let snapshot = empty;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
// Translate only unchanged seeded text; preserve user-authored project content.
function localizeDemoProjects(projects: Project[]): Project[] {
  const legacy: Record<string, { name: string; idea: string }> = {
    "daily-focus": {
      name: "Daily Focus",
      idea: "A simple daily habit tracker with a focused list, weekly progress and gentle reminders.",
    },
    "pocket-pantry": {
      name: "Pocket Pantry",
      idea: "Track pantry items and expiry dates, then create a shopping list for missing essentials.",
    },
  };
  return projects.map((project) => {
    const old = legacy[project.id];
    const seed = mockProjects.find((item) => item.id === project.id);
    if (!old || !seed) return project;
    return {
      ...project,
      name: project.name === old.name ? seed.name : project.name,
      idea: project.idea === old.idea ? seed.idea : project.idea,
    };
  });
}
function initialize() {
  if (snapshot.ready) return;
  try {
    const raw = localStorage.getItem(KEY);
    snapshot = {
      projects: raw
        ? localizeDemoProjects(
            storedProjectsSchema.parse(JSON.parse(raw)).projects,
          )
        : mockProjects,
      ready: true,
      error: null,
    };
  } catch {
    snapshot = {
      projects: mockProjects,
      ready: true,
      error:
        "Kayıtlı veriler yüklenemedi. Demo projeler gösteriliyor; kaydetmek okunamayan verilerin üzerine yazabilir.",
    };
  }
}
function synchronize(event: StorageEvent) {
  if (event.key !== KEY) return;
  try {
    snapshot = {
      projects: event.newValue
        ? localizeDemoProjects(
            storedProjectsSchema.parse(JSON.parse(event.newValue)).projects,
          )
        : mockProjects,
      ready: true,
      error: null,
    };
    emit();
  } catch {
    /* Preserve current data when another tab contains an invalid payload. */
  }
}
function subscribe(listener: () => void) {
  initialize();
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", synchronize);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", synchronize);
  };
}
function save(projects: Project[]) {
  let error: string | null = null;
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, projects }));
  } catch {
    error =
      "Tarayıcı depolama alanına erişilemiyor veya alan dolu. Değişiklikler yalnızca bu sekmede tutulur ve yenilemede kaybolur.";
  }
  snapshot = { projects, ready: true, error };
  emit();
}
function create(input: ProjectInput) {
  const validated = projectInputSchema.parse(input);
  const id = crypto.randomUUID();
  save([
    {
      ...validated,
      id,
      stage: transition("idea", "CREATE_PLAN"),
      aiCost: 0,
      updatedAt: new Date().toISOString(),
    },
    ...snapshot.projects,
  ]);
  return id;
}
function advance(id: string, event: WorkflowEvent) {
  if (event === "APPROVE_DESIGN")
    throw new Error("Önce ekran önizlemelerini inceleyin.");
  save(
    snapshot.projects.map((project) =>
      project.id === id
        ? {
            ...project,
            stage: transition(project.stage, event),
            updatedAt: new Date().toISOString(),
          }
        : project,
    ),
  );
}
function approveDesign(
  id: string,
  screens: readonly string[],
  revision: number,
) {
  const raw = localStorage.getItem(KEY);
  const projects = raw
    ? storedProjectsSchema.parse(JSON.parse(raw)).projects
    : snapshot.projects;
  const next = projects.map((project) =>
    project.id === id
      ? approveVisualDesign(project, screens, revision)
      : project,
  );
  localStorage.setItem(KEY, JSON.stringify({ version: 1, projects: next }));
  snapshot = { projects: next, ready: true, error: null };
  emit();
}
function editSpecification(
  id: string,
  section: SpecificationSection,
  input: unknown,
  expectedRevision: number,
) {
  const raw = localStorage.getItem(KEY);
  const projects = raw
    ? localizeDemoProjects(storedProjectsSchema.parse(JSON.parse(raw)).projects)
    : snapshot.projects;
  const next = projects.map((project) =>
    project.id === id
      ? reviseProject(project, section, input, expectedRevision)
      : project,
  );
  // Persist first: a failed write must not be reported as a saved revision.
  localStorage.setItem(KEY, JSON.stringify({ version: 1, projects: next }));
  snapshot = { projects: next, ready: true, error: null };
  emit();
  const saved = next.find((project) => project.id === id);
  if (!saved) throw new Error("Proje bulunamadı.");
  return getSpecification(saved);
}
function syncPreview(project: Project) {
  const raw = localStorage.getItem(KEY);
  const projects = raw
    ? storedProjectsSchema.parse(JSON.parse(raw)).projects
    : snapshot.projects;
  save(
    projects.map((p) =>
      p.id === project.id && sameSpecification(p, project)
        ? { ...p, stage: "build" as const, updatedAt: new Date().toISOString() }
        : p,
    ),
  );
}
function syncBuilder(job: BuilderJob) {
  if (job.status !== "ready") return;
  const raw = localStorage.getItem(KEY);
  const projects = raw
    ? storedProjectsSchema.parse(JSON.parse(raw)).projects
    : snapshot.projects;
  const current = projects.find((p) => p.id === job.project.id);
  if (
    !current ||
    ["tests", "build"].includes(current.stage) ||
    !sameSpecification(current, job.project)
  )
    return;
  const next = projects.map((p) =>
    p.id === current.id
      ? { ...p, stage: "tests" as const, updatedAt: new Date().toISOString() }
      : p,
  );
  localStorage.setItem(KEY, JSON.stringify({ version: 1, projects: next }));
  snapshot = { projects: next, ready: true, error: null };
  emit();
}
function syncGeneration(job: GenerationJob) {
  const current = snapshot.projects.find(
    (project) => project.id === job.projectId,
  );
  if (
    !current ||
    !sameSpecification(current, job.project) ||
    !["development", "tests", "build"].includes(current.stage)
  )
    return;
  const stage =
    job.status === "ready"
      ? current.stage === "build"
        ? "build"
        : "tests"
      : job.files.length
        ? "tests"
        : null;
  if (!stage) return;
  if (
    !snapshot.projects.some(
      (project) => project.id === job.projectId && project.stage !== stage,
    )
  )
    return;
  save(
    snapshot.projects.map((project) =>
      project.id === job.projectId
        ? { ...project, stage, updatedAt: job.updatedAt }
        : project,
    ),
  );
}
function syncPlannerCost(job: PlannerJob) {
  if (job.status === "running") return;
  const total = job.priorCostUsd + job.costUsd + job.uncertainCostUsd;
  if (
    !snapshot.projects.some((p) => p.id === job.projectId && p.aiCost < total)
  )
    return;
  const raw = localStorage.getItem(KEY);
  const projects = raw
    ? storedProjectsSchema.parse(JSON.parse(raw)).projects
    : snapshot.projects;
  const next = projects.map((p) =>
    p.id === job.projectId ? { ...p, aiCost: Math.max(p.aiCost, total) } : p,
  );
  localStorage.setItem(KEY, JSON.stringify({ version: 1, projects: next }));
  snapshot = { projects: next, ready: true, error: null };
  emit();
}
function applyPlanner(job: PlannerJob) {
  const raw = localStorage.getItem(KEY);
  const projects = raw
    ? storedProjectsSchema.parse(JSON.parse(raw)).projects
    : snapshot.projects;
  const next = projects.map((p) =>
    p.id === job.projectId ? applyPlannerResult(p, job) : p,
  );
  localStorage.setItem(KEY, JSON.stringify({ version: 1, projects: next }));
  snapshot = { projects: next, ready: true, error: null };
  emit();
}
function applyImageApproval(approved: Project, expectedRevision: number) {
  const raw = localStorage.getItem(KEY);
  const projects = raw
    ? storedProjectsSchema.parse(JSON.parse(raw)).projects
    : snapshot.projects;
  const current = projects.find((p) => p.id === approved.id);
  if (!current || getSpecification(current).revision !== expectedRevision)
    throw new Error("Proje değişti. Güncel tasarımı yeniden inceleyin.");
  const next = projects.map((p) =>
    p.id === approved.id
      ? { ...approved, aiCost: Math.max(p.aiCost, approved.aiCost) }
      : p,
  );
  localStorage.setItem(KEY, JSON.stringify({ version: 1, projects: next }));
  snapshot = { projects: next, ready: true, error: null };
  emit();
}
function syncImageCost(id: string, cost: number) {
  if (
    !Number.isFinite(cost) ||
    cost < 0 ||
    !snapshot.projects.some((p) => p.id === id && p.aiCost < cost)
  )
    return;
  const raw = localStorage.getItem(KEY);
  const projects = raw
    ? storedProjectsSchema.parse(JSON.parse(raw)).projects
    : snapshot.projects;
  const next = projects.map((p) =>
    p.id === id ? { ...p, aiCost: Math.max(p.aiCost, cost) } : p,
  );
  localStorage.setItem(KEY, JSON.stringify({ version: 1, projects: next }));
  snapshot = { projects: next, ready: true, error: null };
  emit();
}
const Context = createContext<Store | null>(null);
export function ProjectProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => empty,
  );
  return (
    <Context.Provider
      value={{
        ...state,
        create,
        advance,
        syncGeneration,
        syncBuilder,
        syncPreview,
        editSpecification,
        approveDesign,
        applyPlanner,
        syncPlannerCost,
        applyImageApproval,
        syncImageCost,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useProjects() {
  const store = useContext(Context);
  if (!store) throw new Error("ProjectProvider required");
  return store;
}
