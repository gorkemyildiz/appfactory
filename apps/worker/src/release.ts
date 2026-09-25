import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import {
  type Project,
  type ReleaseChecklist,
  releaseChecklistSchema,
} from "@app-factory/schemas";
import { sourceFingerprint } from "./preview";
import { assertRealDirectory } from "@app-factory/generator";
import type { EasSource } from "./eas";
export class ReleaseManager {
  private writes = Promise.resolve();
  constructor(
    private root: string,
    private resolve: (project: Project, id: string) => EasSource,
    private requirements: (id: string) => string[],
    private previewApproved: (project: Project, id: string) => Promise<void>,
  ) {}
  private async context(project: Project, id: string) {
    const source = this.resolve(project, id);
    const cwd = path.resolve(this.root, source.outputPath);
    if (
      cwd !==
      path.join(this.root, "workspace/generated-projects", project.id, id)
    )
      throw new Error("Çıktı yolu geçersiz.");
    await assertRealDirectory(cwd);
    const labels = [
      "Demo verilerle ekranları ve temel işlemleri denedim.",
      "Demo modunu kapattım; gerçek veri ve boş durum davranışını kontrol ettim.",
      "Gerekli veritabanı/API bağlantılarını ve erişim izinlerini gerçek modda doğruladım (gerekmeyenleri kontrol ettim).",
      ...this.requirements(id),
    ];
    const items = [...new Set(labels)].map((label) => ({
      id: createHash("sha256").update(label).digest("hex").slice(0, 24),
      label,
      checked: false,
    }));
    const fingerprint = createHash("sha256")
      .update(await sourceFingerprint(cwd))
      .update(JSON.stringify(items))
      .digest("hex");
    const directory = path.join(this.root, "workspace/release");
    await mkdir(directory, { recursive: true });
    await assertRealDirectory(directory);
    return { fingerprint, items, file: path.join(directory, id + ".json") };
  }
  async info(project: Project, id: string): Promise<ReleaseChecklist> {
    const context = await this.context(project, id);
    let checked = new Set<string>();
    try {
      const saved = releaseChecklistSchema.parse(
        JSON.parse(await readFile(context.file, "utf8")),
      );
      if (saved.fingerprint === context.fingerprint)
        checked = new Set(
          saved.items.filter((i) => i.checked).map((i) => i.id),
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const items = context.items.map((item) => ({
      ...item,
      checked: checked.has(item.id),
    }));
    return {
      fingerprint: context.fingerprint,
      items,
      ready: items.every((i) => i.checked),
    };
  }
  async set(
    project: Project,
    id: string,
    fingerprint: string,
    itemId: string,
    checked: boolean,
  ) {
    const action = this.writes
      .catch(() => {})
      .then(async () => {
        await this.previewApproved(project, id);
        const state = await this.info(project, id);
        if (state.fingerprint !== fingerprint)
          throw new Error(
            "Kod veya kontrol listesi değişti. Listeyi yenileyin.",
          );
        if (!state.items.some((i) => i.id === itemId))
          throw new Error("Kontrol maddesi bulunamadı.");
        state.items = state.items.map((i) =>
          i.id === itemId ? { ...i, checked } : i,
        );
        state.ready = state.items.every((i) => i.checked);
        const file = (await this.context(project, id)).file;
        await writeFile(file + ".tmp", JSON.stringify(state), { mode: 0o600 });
        await rename(file + ".tmp", file);
        return state;
      });
    this.writes = action.then(
      () => {},
      () => {},
    );
    return action;
  }
  async assertReady(project: Project, id: string) {
    if (!(await this.info(project, id)).ready)
      throw new Error(
        "APK göndermeden önce zorunlu tamamlama listesini tamamlayın.",
      );
  }
}
