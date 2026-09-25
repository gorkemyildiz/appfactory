import { tmpdir } from "node:os";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  symlink,
  realpath,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  PreviewManager,
  sourceFingerprint,
  previewEnvironment,
} from "./preview";
import { EasManager } from "./eas";
import { previewRequestSchema, type Project } from "@app-factory/schemas";
const project: Project = {
  id: "preview-test",
  name: "Preview test",
  idea: "Telefon önizlemesi için örnek uygulama",
  type: "mobile",
  android: true,
  ios: true,
  stage: "tests",
  budgetLimit: 1,
  aiCost: 0,
  updatedAt: new Date().toISOString(),
};
async function fixture() {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), "preview-test-")),
  );
  const id = randomUUID(),
    outputPath = `workspace/generated-projects/${project.id}/${id}`,
    cwd = path.join(root, outputPath);
  await mkdir(cwd, { recursive: true });
  await writeFile(path.join(cwd, "app.json"), "{}");
  return { root, id, cwd, source: { id, project, outputPath } };
}
test("preview approval survives restart but changes to code invalidate it", async () => {
  const f = await fixture();
  try {
    const resolve = () => f.source;
    const m = new PreviewManager(f.root, resolve);
    await m.initialize();
    await assert.rejects(m.assertApproved(project, f.id), /önce Expo/);
    const approval = {
      projectId: project.id,
      sourceJobId: f.id,
      sessionId: randomUUID(),
      fingerprint: await sourceFingerprint(f.cwd),
      approvedAt: new Date().toISOString(),
      platforms: ["ios"],
    };
    await writeFile(
      path.join(f.root, "workspace/previews", f.id + ".json"),
      JSON.stringify(approval),
    );
    const restored = new PreviewManager(f.root, resolve);
    await restored.initialize();
    await restored.assertApproved(project, f.id);
    assert.deepEqual(
      (await restored.info(project.id)).approvals[0]?.platforms,
      ["ios"],
    );
    await mkdir(path.join(f.cwd, ".expo"));
    await writeFile(path.join(f.cwd, ".expo/settings.json"), "{}");
    await restored.assertApproved(project, f.id);
    await writeFile(path.join(f.cwd, "screen.tsx"), "changed");
    await assert.rejects(restored.assertApproved(project, f.id), /önce Expo/);
    assert.equal((await restored.info(project.id)).approvals.length, 0);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test("approval requires a live ready session, platform choice and matching source", async () => {
  const f = await fixture();
  try {
    const m = new PreviewManager(f.root, () => f.source);
    await m.initialize();
    await assert.rejects(
      m.action({
        action: "approve",
        project,
        sourceJobId: f.id,
        sessionId: randomUUID(),
        platforms: ["ios"],
      }),
      /önce güncel/i,
    );
    assert.equal(
      previewRequestSchema.safeParse({
        action: "approve",
        project,
        sourceJobId: f.id,
        sessionId: randomUUID(),
        platforms: [],
      }).success,
      false,
    );
    await assert.rejects(
      m.action({
        action: "stop",
        projectId: project.id,
        sessionId: randomUUID(),
      }),
      /oturumu değişti/,
    );
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test("fingerprint rejects linked source files and preview env excludes unrelated keys", async () => {
  const f = await fixture();
  try {
    await symlink(
      f.root,
      path.join(f.cwd, "linked-directory"),
      process.platform === "win32" ? "junction" : "dir",
    );
    await assert.rejects(sourceFingerprint(f.cwd), /sembolik/);
    const env = previewEnvironment("192.168.1.2");
    assert.equal(env.EXPO_NO_DOTENV, "1");
    assert.equal(env.REACT_NATIVE_PACKAGER_HOSTNAME, "192.168.1.2");
    assert.equal("OPENAI_API_KEY" in env, false);
    assert.equal("SUPABASE_SERVICE_ROLE_KEY" in env, false);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test("EAS refuses to submit without current preview approval", async () => {
  const f = await fixture();
  try {
    let commands = 0;
    const p = new PreviewManager(f.root, () => f.source);
    await p.initialize();
    const eas = new EasManager(
      f.root,
      () => f.source,
      "test",
      async () => {
        commands++;
        return { code: 0, stdout: "", stderr: "" };
      },
      async () => {},
      (project, id) => p.assertApproved(project, id),
    );
    await eas.initialize();
    await assert.rejects(
      eas.start({
        action: "start",
        project,
        sourceJobId: f.id,
        requestId: randomUUID(),
        expectedLatestId: null,
      }),
      /önce Expo/,
    );
    assert.equal(commands, 0);
    assert.equal(eas.list(project.id).length, 0);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
