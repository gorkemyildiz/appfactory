import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { type Project } from "@app-factory/schemas";
import { ReleaseManager } from "./release";
test("release checklist requires preview, persists, blocks incomplete and invalidates modified code", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "release-test-"));
  try {
    const project: Project = {
      id: "test",
      name: "Test",
      idea: "Test application",
      type: "mobile",
      android: true,
      ios: false,
      stage: "build",
      budgetLimit: 1,
      aiCost: 0,
      updatedAt: new Date().toISOString(),
    };
    const id = randomUUID(),
      outputPath = `workspace/generated-projects/test/${id}`;
    const cwd = path.join(root, outputPath);
    await mkdir(cwd, { recursive: true });
    await writeFile(path.join(cwd, "app.ts"), "original");
    let approved = false;
    const source = { id, project, outputPath };
    const create = () =>
      new ReleaseManager(
        root,
        () => source,
        () => ["API bağlantısını test ettim"],
        async () => {
          if (!approved) throw new Error("preview required");
        },
      );
    const manager = create();
    let state = await manager.info(project, id);
    await assert.rejects(manager.assertReady(project, id), /tamamlama/);
    await assert.rejects(
      manager.set(project, id, state.fingerprint, state.items[0]!.id, true),
      /preview/,
    );
    approved = true;
    for (const item of state.items)
      state = await manager.set(project, id, state.fingerprint, item.id, true);
    await create().assertReady(project, id);
    await assert.rejects(
      manager.set(project, id, state.fingerprint, "unknown", true),
      /bulunamadı/,
    );
    await writeFile(path.join(cwd, "app.ts"), "modified");
    await assert.rejects(
      manager.set(project, id, state.fingerprint, state.items[0]!.id, true),
      /değişti/,
    );
    const next = await create().info(project, id);
    assert.equal(next.ready, false);
    assert.ok(next.items.every((i) => !i.checked));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
