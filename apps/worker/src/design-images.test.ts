import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  getSpecification,
  getScreens,
  approveImageDesign,
  type Project,
} from "@app-factory/schemas";
import { DesignImageManager } from "./design-images";
const base: Project = {
  id: "image-test",
  name: "Test",
  idea: "Yerel alışkanlık takibi için mobil uygulama.",
  type: "mobile",
  android: true,
  ios: false,
  budgetLimit: 1,
  aiCost: 0,
  stage: "design",
  updatedAt: new Date().toISOString(),
};
const project = {
  ...base,
  specification: {
    ...getSpecification(base),
    screens: getScreens(getSpecification(base)).map((s) => ({
      ...s,
      enabled: s.id === "home",
    })),
  },
};
async function finish(m: DesignImageManager) {
  for (let i = 0; i < 100; i++) {
    if (!m.busy) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Timeout");
}
test("image requests are idempotent; history, costs, latest approval and retry cap are enforced", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "design-test-"));
  try {
    let calls = 0;
    const m = new DesignImageManager(
      root,
      () => 0.02,
      "test",
      async () => {
        calls++;
        return { png: Buffer.from("fixture"), costUsd: 0.04 };
      },
    );
    await m.initialize();
    const request = {
      project,
      screenId: "home",
      brief: "Özgün",
      requestId: randomUUID(),
      expectedLatestId: null,
    };
    const first = await m.start(request);
    await finish(m);
    await m.start(request);
    assert.equal(calls, 1);
    assert.throws(() => approveImageDesign(project, m.list(project.id), []));
    const approved = approveImageDesign(project, m.list(project.id), [
      first.id,
    ]);
    assert.equal(approved.stage, "development");
    assert.equal(approved.specification?.revision, 1);
    assert.equal(approved.designReview?.images?.[0]?.assetId, first.id);
    const next = await m.start({
      ...request,
      requestId: randomUUID(),
      expectedLatestId: first.id,
    });
    await finish(m);
    assert.throws(() =>
      approveImageDesign(project, m.list(project.id), [first.id]),
    );
    await assert.rejects(
      m.start({
        ...request,
        requestId: randomUUID(),
        expectedLatestId: first.id,
      }),
      /güncellendi/,
    );
    await m.start({
      ...request,
      requestId: randomUUID(),
      expectedLatestId: next.id,
    });
    await finish(m);
    await assert.rejects(
      m.start({
        ...request,
        requestId: randomUUID(),
        expectedLatestId: m.list(project.id).at(-1)!.id,
      }),
      /iki yeniden/,
    );
    assert.equal(calls, 3);
    assert.equal(m.list(project.id).length, 3);
    assert.ok(Math.abs(m.totalCost(project.id) - 0.14) < 1e-9);
    assert.equal(
      (
        await readFile(root + "/workspace/design-images/" + first.id + ".png")
      ).toString(),
      "fixture",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("insufficient project budget prevents requests; interrupted generation keeps its reservation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "design-budget-"));
  try {
    const m = new DesignImageManager(
      root,
      () => 0.9,
      "test",
      () => new Promise(() => {}),
    );
    await m.initialize();
    const request = {
      project,
      screenId: "home",
      brief: "",
      requestId: randomUUID(),
      expectedLatestId: null,
    };
    await assert.rejects(m.start(request), /bütçesi/);
    await m.start({ ...request, project: { ...project, budgetLimit: 2 } });
    const restarted = new DesignImageManager(root);
    await restarted.initialize();
    assert.equal(restarted.list(project.id)[0]?.status, "failed");
    assert.equal(restarted.list(project.id)[0]?.uncertainCostUsd, 0.2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
