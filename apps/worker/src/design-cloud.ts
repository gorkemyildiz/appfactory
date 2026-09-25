import { createHash } from "node:crypto";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";
import {
  designImageJobSchema,
  projectIdSchema,
  type DesignImageJob,
} from "@app-factory/schemas";
import { assertRealDirectory } from "@app-factory/generator";

export function decodeDesignAsset(base64: string, hash: string) {
  if (
    typeof base64 !== "string" ||
    base64.length > 28000000 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
  )
    throw new Error("Bulut görseli geçersiz.");
  const png = Buffer.from(base64, "base64");
  if (
    png.length > 20000000 ||
    png.toString("base64") !== base64 ||
    !png
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    createHash("sha256").update(png).digest("hex") !== hash
  )
    throw new Error("Bulut görseli bütünlük kontrolünden geçemedi.");
  return png;
}
export class DesignAssetCloud {
  private pending = new Map<string, Promise<void>>();
  private uploaded = new Set<string>();
  private last = new Map<string, number>();
  constructor(
    private root: string,
    private url: string,
    private key: string,
    private transport: typeof fetch = fetch,
  ) {}
  static async fromEnvironment(root: string) {
    let env: Record<string, string | undefined> = {};
    try {
      env = parseEnv(await readFile(path.join(root, ".env"), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
    return url && key ? new DesignAssetCloud(root, url, key) : null;
  }
  private async api(route: string, method = "GET", body?: unknown) {
    const response = await this.transport(this.url + "/rest/v1/" + route, {
      method,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok)
      throw new Error(
        response.status === 404
          ? "Supabase görsel tablosu yok. 202609250002_design_assets.sql migration dosyasını çalıştırın."
          : `Tasarım görselleri Supabase ile eşitlenemedi (HTTP ${response.status}). Yerel dosyalar korundu.`,
      );
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  sync(projectId: string, jobs: Map<string, DesignImageJob>, force = false): Promise<void> {
    projectIdSchema.parse(projectId);
    const existing = this.pending.get(projectId);
    if (existing)
      return force
        ? existing.then(() => this.sync(projectId, jobs, true))
        : existing;
    if (!force && Date.now() - (this.last.get(projectId) ?? 0) < 15000)
      return Promise.resolve();
    const work = this.transfer(projectId, jobs)
      .then(() => {
        this.last.set(projectId, Date.now());
      })
      .finally(() => {
        this.pending.delete(projectId);
      });
    this.pending.set(projectId, work);
    return work;
  }
  private async transfer(projectId: string, jobs: Map<string, DesignImageJob>) {
    const projects = await this.api(
      `factory_projects?select=workspace_id&id=eq.${encodeURIComponent(projectId)}`,
    );
    if (!Array.isArray(projects) || projects.length !== 1)
      throw new Error(
        "Görselleri eşitlemek için proje tek bir Supabase çalışma alanına kaydedilmiş olmalı.",
      );
    const workspace = projects[0].workspace_id;
    const directory = path.join(this.root, "workspace/design-images");
    await mkdir(directory, { recursive: true });
    await assertRealDirectory(directory);
    for (const job of jobs.values()) {
      if (
        job.projectId !== projectId ||
        job.status !== "succeeded" ||
        this.uploaded.has(job.id)
      )
        continue;
      let png: Buffer;
      try {
        png = await readFile(path.join(directory, job.id + ".png"));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      const sha256 = createHash("sha256").update(png).digest("hex");
      decodeDesignAsset(png.toString("base64"), sha256);
      await this.api(
        "factory_design_assets?on_conflict=workspace_id,id",
        "POST",
        {
          workspace_id: workspace,
          project_id: projectId,
          id: job.id,
          job,
          png_base64: png.toString("base64"),
          sha256,
        },
      );
      const stored = await this.api(
        `factory_design_assets?select=sha256&workspace_id=eq.${workspace}&id=eq.${job.id}`,
      );
      if (stored?.[0]?.sha256 !== sha256)
        throw new Error(
          "Aynı kimlikte farklı bulut görseli var; dosyalar korunuyor.",
        );
      this.uploaded.add(job.id);
    }
    const rows = await this.api(
      `factory_design_assets?select=id,job,sha256&workspace_id=eq.${workspace}&project_id=eq.${encodeURIComponent(projectId)}&order=created_at.asc&limit=1000`,
    );
    for (const row of rows) {
      const job = designImageJobSchema.parse(row.job);
      if (
        job.id !== row.id ||
        job.projectId !== projectId ||
        job.status !== "succeeded"
      )
        throw new Error("Bulut görsel kaydı geçersiz.");
      let local: Buffer | null = null;
      try {
        local = await readFile(path.join(directory, job.id + ".png"));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (
        local &&
        createHash("sha256").update(local).digest("hex") !== row.sha256
      )
        throw new Error(
          "Yerel ve bulut görseli farklı; yerel dosya korunuyor.",
        );
      if (!local) {
        const assets = await this.api(
          `factory_design_assets?select=png_base64&workspace_id=eq.${workspace}&id=eq.${job.id}`,
        );
        const png = decodeDesignAsset(assets?.[0]?.png_base64, row.sha256);
        const target = path.join(directory, job.id + ".png");
        await writeFile(target + ".download", png, { mode: 0o600 });
        await rename(target + ".download", target);
      }
      const target = path.join(directory, job.id + ".json");
      await writeFile(target + ".cloud", JSON.stringify(job, null, 2) + "\n", {
        mode: 0o600,
      });
      await rename(target + ".cloud", target);
      jobs.set(job.id, job);
      this.uploaded.add(job.id);
    }
  }
}
