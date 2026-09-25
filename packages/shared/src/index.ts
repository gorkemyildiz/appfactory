import type { Project, Stage } from "@app-factory/schemas";
export const stages = [
  "idea",
  "plan",
  "screens",
  "design",
  "development",
  "tests",
  "build",
] as const;
export const stageLabels: Record<Stage, string> = {
  idea: "Fikir",
  plan: "Plan onayı",
  screens: "Ekran onayı",
  design: "Tasarım onayı",
  development: "Geliştirme",
  tests: "Testler",
  build: "Derleme",
};
export const MAX_RETRIES = 2;
export const taskPolicy = {
  maxRetries: MAX_RETRIES,
  contextStrategy: "project-memory-and-task",
  defaultTaskBudgetUsd: 0.5,
} as const;
export type WorkflowEvent =
  | "CREATE_PLAN"
  | "APPROVE_PLAN"
  | "APPROVE_SCREENS"
  | "APPROVE_DESIGN";
const transitions: Partial<
  Record<Stage, Partial<Record<WorkflowEvent, Stage>>>
> = {
  idea: { CREATE_PLAN: "plan" },
  plan: { APPROVE_PLAN: "screens" },
  screens: { APPROVE_SCREENS: "design" },
  design: { APPROVE_DESIGN: "development" },
};
export function transition(stage: Stage, event: WorkflowEvent): Stage {
  const next = transitions[stage]?.[event];
  if (!next)
    throw new Error(`Transition ${event} is not allowed from ${stage}`);
  return next;
}
export function progress(stage: Stage) {
  return Math.round((stages.indexOf(stage) / stages.length) * 100);
}
export const mockProjects: Project[] = [
  {
    id: "daily-focus",
    name: "Günlük Odak",
    type: "mobile",
    android: true,
    ios: true,
    idea: "Sade bir liste, haftalık ilerleme ve hatırlatmalarla günlük alışkanlık takibi.",
    budgetLimit: 10,
    stage: "plan",
    aiCost: 0,
    updatedAt: "2026-09-23T12:30:00.000Z",
  },
  {
    id: "pocket-pantry",
    name: "Cep Kileri",
    type: "mobile",
    android: true,
    ios: false,
    idea: "Kilerdeki ürünleri ve son kullanma tarihlerini takip edin, eksikler için alışveriş listesi oluşturun.",
    budgetLimit: 15,
    stage: "idea",
    aiCost: 0,
    updatedAt: "2026-09-22T09:00:00.000Z",
  },
];
export function getDemoArtifacts(project: Project) {
  return {
    summary: `Şu fikir için bir mobil uygulama: ${project.idea}`,
    scope: [
      "Tek bir temel iş akışı",
      "İlk prototipte öncelikli olarak yerel veri saklama",
      "Sade gezinme ve erişilebilir form alanları",
    ],
    screens: [
      {
        name: "Ana ekran",
        route: "/",
        description: `${project.name} için özet ve ana eylem içeren başlangıç ekranı.`,
      },
      {
        name: "Kayıt oluştur",
        route: "/create",
        description:
          "Yeni kayıt eklemek ve zorunlu alanları doğrulamak için sade bir form.",
      },
      {
        name: "Kayıt ayrıntıları",
        route: "/items/[id]",
        description: "Bir kaydı görüntüleyin ve güncelleyin.",
      },
      {
        name: "Ayarlar",
        route: "/settings",
        description: "Uygulama tercihleri ve yerel veri yönetimi.",
      },
    ],
    tasks: [
      "Expo Router şablonunu hazırla",
      "Ana ekranı ve ortak gezinme yapısını geliştir",
      "Oluşturma ve ayrıntı ekranlarını geliştir",
      "Yerel veri saklama ve doğrulama ekle",
      "TypeScript ve ESLint kontrollerini çalıştır",
    ],
  };
}
