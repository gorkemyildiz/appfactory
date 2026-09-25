import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  getSpecification,
  type Project,
  type FeatureOutput,
} from "@app-factory/schemas";
import {
  validateFeatures,
  validateApplicationCode,
  checkFeatureRules,
} from "./feature-code";
import { BuilderManager } from "./builder";
import { generateProject } from "@app-factory/generator";

const project: Project = {
  id: "features-test",
  name: "ParkSpot test",
  type: "mobile",
  android: true,
  ios: false,
  idea: "Park yerleri 7 dakika aktif kalır, ilk 3 dakika yeşil, 3–5 dakika sarı ve 5–7 dakika kırmızı gösterilir.",
  budgetLimit: 2,
  aiCost: 0,
  stage: "development",
  updatedAt: "2026-09-25T10:00:00.000Z",
};
project.specification = {
  ...getSpecification(project),
  screens: [
    {
      id: "home",
      enabled: true,
      name: "Harita",
      description: "Yakındaki park yerleri",
    },
  ],
};
project.designReview = {
  revision: 0,
  screens: ["home"],
  reviewedAt: project.updatedAt,
};
const output: FeatureOutput = {
  files: [
    {
      path: "src/features/models.ts",
      code: 'export type Status = "green" | "yellow" | "red" | "expired";',
    },
    {
      path: "src/features/domain.ts",
      code: 'import type {Status} from "./models"; export function status(ageMs:number): Status { if(ageMs<0 || ageMs>=420000)return "expired"; if(ageMs<180000)return "green"; if(ageMs<300000)return "yellow"; return "red"; }',
    },
    {
      path: "src/features/services.ts",
      code: "export const available = true;",
    },
    {
      path: "src/features/store.tsx",
      code: 'import type {ReactNode} from "react"; export function AppProvider({children}:{children:ReactNode}) {return children;} export function useApp(){return {ready:true,error:null};}',
    },
  ],
  summary: "Park yeri süre kuralları",
  limitations: [],
  capabilities: ["storage"],
  migrationSql: "",
  setup: [],
  coverage: [
    {
      requirement: "Süre renkleri",
      status: "implemented",
      detail: "Dakika eşikleri uygulanır.",
    },
  ],
  tests: [0, 179999, 180000, 299999, 300000, 419999, 420000, -1].map(
    (age, i) => ({
      name: `Süre sınırı ${age}`,
      exportName: "status",
      argsJson: JSON.stringify([age]),
      expectedJson: JSON.stringify(
        [
          "green",
          "green",
          "yellow",
          "yellow",
          "red",
          "red",
          "expired",
          "expired",
        ][i],
      ),
    }),
  ),
};
const command = async () => ({
  exitCode: 0,
  output: "mock check",
  durationMs: 1,
});
async function finished(manager: BuilderManager) {
  for (let i = 0; i < 500; i++) {
    if (!manager.busy) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Test zaman aşımı");
}

test("pure business-rule checks exercise ParkSpot time boundaries and reject incorrect results", async () => {
  assert.equal((await checkFeatureRules(validateFeatures(output))).length, 8);
  await assert.rejects(
    checkFeatureRules({
      ...output,
      tests: output.tests.map((t) => ({ ...t, expectedJson: '"wrong"' })),
    }),
    /başarısız/,
  );
});
test("feature output cannot write configuration, import host modules or skip external setup", () => {
  for (const code of [
    'import fs from "node:fs"; export const x=fs;',
    'export const x = () => import("react");',
    'export const x = () => fetch("https://example.com");',
    "export const x = () => ({}).constructor;",
    "// @ts-ignore\nexport const x=1;",
  ])
    assert.throws(() =>
      validateApplicationCode(code, "src/features/services.ts"),
    );
  assert.throws(() =>
    validateFeatures({
      ...output,
      files: output.files.map((f) => ({ ...f, path: "../../.env" })),
    }),
  );
  assert.throws(
    () =>
      validateFeatures({
        ...output,
        files: [output.files[0], ...output.files.slice(0, 3)],
      }),
    /bir kez/,
  );
  assert.throws(
    () => validateFeatures({ ...output, capabilities: ["backend"] }),
    /migration/,
  );
  assert.throws(
    () =>
      validateApplicationCode(
        "export default () => null;",
        "app/index.tsx",
        true,
      ),
    /useApp/,
  );
});
test("application Builder generates shared features before connected screens and persists evidence", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "application-builder-"));
  try {
    await cp(path.resolve("templates"), path.join(root, "templates"), {
      recursive: true,
    });
    const calls: string[] = [];
    const manager = new BuilderManager(
      root,
      () => 0,
      "test",
      async (input) => {
        const context = JSON.parse(input.context);
        calls.push(context.task);
        assert.equal(context.applicationMode, true);
        assert.ok(context.modules["src/features/domain.ts"].includes("status"));
        return {
          costUsd: 0.01,
          output: {
            code: 'import {useApp} from "../src/features/store"; export default function Home(){ const {ready}=useApp(); return ready ? null : null; }',
            summary: "Bağlı ekran",
            limitations: [],
          },
        };
      },
      command,
      generateProject,
      async (input) => {
        calls.push(JSON.parse(input.context).task);
        return { output, costUsd: 0.02 };
      },
    );
    await manager.initialize();
    const job = await manager.start(project);
    await finished(manager);
    assert.equal(job.status, "ready", job.error ?? "");
    assert.deepEqual(calls, ["BUILD_APPLICATION_FEATURES", "BUILD_SCREEN"]);
    assert.equal(job.implementation?.checks.length, 8);
    assert.equal(manager.totalCost(project.id), 0.03);
    assert.match(
      await readFile(
        path.join(root, job.outputPath, "app/_layout.tsx"),
        "utf8",
      ),
      /AppProvider/,
    );
    const config = JSON.parse(
      await readFile(
        path.join(root, job.outputPath, "src/runtime/connection.json"),
        "utf8",
      ),
    );
    assert.equal(config.publishableKey, "");
    await manager.start(project);
    assert.equal(calls.length, 2);
    const restarted = new BuilderManager(root);
    await restarted.initialize();
    assert.equal(restarted.jobs.get(job.id)?.implementation?.checks.length, 8);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("failed feature checks roll back every generated module and retry only the incomplete task", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "application-rollback-"));
  try {
    await cp(path.resolve("templates"), path.join(root, "templates"), {
      recursive: true,
    });
    const manager = new BuilderManager(
      root,
      () => 0,
      "test",
      async () => {
        throw new Error("Screen must not start");
      },
      async (_cmd, args) => ({
        ...(await command()),
        exitCode: args.includes("--noEmit") ? 1 : 0,
      }),
      generateProject,
      async () => ({ output, costUsd: 0.01 }),
    );
    await manager.initialize();
    const job = await manager.start(project);
    await finished(manager);
    assert.equal(job.status, "failed");
    assert.equal(job.implementation, undefined);
    for (const file of output.files)
      await assert.rejects(access(path.join(root, job.outputPath, file.path)));
    await manager.start(project, true);
    await finished(manager);
    assert.equal(job.tasks[0]?.attempts, 2);
    assert.equal(job.tasks[1]?.attempts, 0);
    assert.equal(manager.totalCost(project.id), 0.02);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
