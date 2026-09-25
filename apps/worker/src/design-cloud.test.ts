import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { DesignAssetCloud, decodeDesignAsset } from "./design-cloud";
import type { DesignImageJob } from "@app-factory/schemas";

test("base64 design assets reject corrupt data and invalid PNG signatures", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
  const hash = createHash("sha256").update(png).digest("hex");
  assert.deepEqual(decodeDesignAsset(png.toString("base64"), hash), png);
  assert.throws(() => decodeDesignAsset(png.toString("base64"), "bad"));
  assert.throws(() => decodeDesignAsset("hello", hash));
});
test("one computer uploads once and another restores metadata and PNG without AI", async () => {
  const first = await mkdtemp(path.join(tmpdir(), "cloud-first-")),
    second = await mkdtemp(path.join(tmpdir(), "cloud-second-"));
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
  const job: DesignImageJob = {
    id: randomUUID(),
    projectId: "cloud-test",
    revision: 0,
    screenId: "home",
    screenName: "Ana ekran",
    brief: "Test",
    status: "succeeded",
    costUsd: 0.03,
    reservedUsd: 0,
    uncertainCostUsd: 0,
    error: null,
    createdAt: new Date().toISOString(),
    model: "test",
  };
  let stored: Record<string, unknown> | undefined;
  let writes = 0;
  let imageDownloads = 0;
  const transport: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("factory_projects?"))
      return Response.json([{ workspace_id: randomUUID() }]);
    if (init?.method === "POST") {
      writes++;
      stored = JSON.parse(String(init.body));
      return new Response(null, { status: 201 });
    }
    if (url.includes("select=sha256"))
      return Response.json(stored ? [{ sha256: stored.sha256 }] : []);
    if (url.includes("select=png_base64")) {
      imageDownloads++;
      return Response.json([{ png_base64: stored!.png_base64 }]);
    }
    return Response.json(
      stored ? [{ id: stored.id, job: stored.job, sha256: stored.sha256 }] : [],
    );
  };
  try {
    await mkdir(path.join(first, "workspace/design-images"), {
      recursive: true,
    });
    await writeFile(
      path.join(first, "workspace/design-images", job.id + ".png"),
      png,
    );
    const source = new DesignAssetCloud(
      first,
      "https://example.test",
      "secret",
      transport,
    );
    await source.sync(job.projectId, new Map([[job.id, job]]), true);
    const received = new Map<string, DesignImageJob>();
    const destination = new DesignAssetCloud(
      second,
      "https://example.test",
      "secret",
      transport,
    );
    await destination.sync(job.projectId, received, true);
    assert.deepEqual(received.get(job.id), job);
    assert.deepEqual(
      await readFile(
        path.join(second, "workspace/design-images", job.id + ".png"),
      ),
      png,
    );
    assert.equal(
      JSON.parse(
        await readFile(
          path.join(second, "workspace/design-images", job.id + ".json"),
          "utf8",
        ),
      ).id,
      job.id,
    );
    await destination.sync(job.projectId, received, true);
    assert.equal(writes, 1);
    assert.equal(imageDownloads, 1);
  } finally {
    await rm(first, { recursive: true, force: true });
    await rm(second, { recursive: true, force: true });
  }
});
test("missing migration fails with actionable message", async () => {
  const store = new DesignAssetCloud(
    "unused",
    "https://example.test",
    "secret",
    async () => new Response(null, { status: 404 }),
  );
  await assert.rejects(
    store.sync("test", new Map(), true),
    /202609250002_design_assets.sql/,
  );
});
