import { screenFile } from "@app-factory/schemas";
import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  rename,
  realpath,
  lstat,
  cp,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  builderJobSchema,
  projectSchema,
  projectIdSchema,
  getScreens,
  getSpecification,
  sameSpecification,
  revisionRequestSchema,
  type BuilderJob,
  type Project,
} from "@app-factory/schemas";
import { assertRealDirectory, generateProject } from "@app-factory/generator";
import {
  runBuilder,
  builderReservationUsd,
  builderTaskLimitUsd,
  PlannerError,
} from "@app-factory/ai";
import { runCommand } from "./runner";
import type { EasSource } from "./eas";
import {
  validateScreenCode,
  cleanScreenImports,
  validateRecordContract,
  validateRecordUsage,
  screenRequirements,
} from "./builder-code";
export class BuilderManager {
  readonly jobs = new Map<string, BuilderJob>();
  private locked = false;
  get busy() {
    return this.locked;
  }
  get enabled() {
    return !!this.key.trim();
  }
  constructor(
    private root: string,
    private otherSpend: (id: string) => number = () => 0,
    private key = process.env.OPENAI_API_KEY ?? "",
    private run = runBuilder,
    private command = runCommand,
    private generate = generateProject,
  ) {}
  list(id: string) {
    return [...this.jobs.values()]
      .filter((j) => j.project.id === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  spent(id: string) {
    return this.list(id).reduce(
      (n, j) =>
        n +
        j.tasks.reduce(
          (s, t) => s + t.costUsd + t.uncertainCostUsd + t.reservedUsd,
          0,
        ),
      0,
    );
  }
  totalCost(id: string) {
    return (
      this.otherSpend(id) +
      this.spent(id) -
      this.list(id).reduce(
        (n, j) => n + j.tasks.reduce((s, t) => s + t.reservedUsd, 0),
        0,
      )
    );
  }
  private async persist(job: BuilderJob) {
    const file = path.join(this.root, "workspace/builder", job.id + ".json");
    await writeFile(file + ".tmp", JSON.stringify(job, null, 2) + "\n", {
      mode: 0o600,
    });
    await rename(file + ".tmp", file);
  }
  async initialize() {
    this.root = await realpath(this.root);
    const dir = path.join(this.root, "workspace/builder");
    await mkdir(dir, { recursive: true });
    await assertRealDirectory(dir);
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".json")) continue;
      const job = builderJobSchema.parse(
        JSON.parse(await readFile(path.join(dir, file), "utf8")),
      );
      if (file !== job.id + ".json")
        throw new Error("Builder iş kaydı geçersiz.");
      if (job.status === "running") {
        job.status = "failed";
        job.error = "Worker yeniden başladı. Görev elle devam ettirilebilir.";
        for (const task of job.tasks)
          if (task.status === "running") {
            task.status = "failed";
            task.uncertainCostUsd += task.reservedUsd;
            task.reservedUsd = 0;
          }
        await this.persist(job);
      }
      this.jobs.set(job.id, job);
    }
  }
  async start(input: Project, retry = false) {
    const project = projectSchema
      .safeExtend({ id: projectIdSchema })
      .parse(input);
    if (!this.enabled) throw new Error("Builder için OPENAI_API_KEY gerekli.");
    if (
      !["development", "tests", "build"].includes(project.stage) ||
      !project.designReview?.images?.length ||
      project.designReview.revision !== getSpecification(project).revision
    )
      throw new Error("Önce tüm tasarım görsellerini onaylayın.");
    const existing = this.list(project.id).find(
      (j) =>
        !j.change &&
        getSpecification(j.project).revision ===
          getSpecification(project).revision,
    );
    if (existing && !sameSpecification(existing.project, project))
      throw new Error("Proje sürümü değişti. Sayfayı yenileyin.");
    if (existing && (existing.status !== "failed" || !retry)) return existing;
    if (this.locked)
      throw new Error("Bir Builder işi sürüyor. Tamamlanmasını bekleyin.");
    if (existing?.tasks.some((t) => t.status !== "ready" && t.attempts >= 3))
      throw new Error("Ekran için iki yeniden deneme hakkı kullanıldı.");
    if (existing && !existing.installed && existing.setupAttempts >= 3)
      throw new Error("Kurulum deneme sınırına ulaşıldı.");
    if (
      Math.max(project.aiCost, this.totalCost(project.id)) +
        builderReservationUsd >
      project.budgetLimit
    )
      throw new Error("Builder için proje bütçesi yetersiz.");
    const job: BuilderJob = existing ?? {
      id: randomUUID(),
      project,
      status: "running",
      outputPath: "",
      setupAttempts: 0,
      installed: false,
      error: null,
      setupLog: "",
      createdAt: new Date().toISOString(),
      tasks: getScreens(getSpecification(project))
        .filter((s) => s.enabled)
        .map((s) => ({
          screenId: s.id,
          name: s.name,
          status: "pending",
          attempts: 0,
          costUsd: 0,
          reservedUsd: 0,
          uncertainCostUsd: 0,
          summary: "",
          limitations: [],
          log: "",
        })),
    };
    this.locked = true;
    job.status = "running";
    job.error = null;
    try {
      await this.persist(job);
      this.jobs.set(job.id, job);
    } catch (error) {
      this.locked = false;
      throw error;
    }
    void this.execute(job);
    return job;
  }
  async revise(
    raw: unknown,
    resolveSource: (project: Project, id: string) => EasSource,
  ) {
    const req = revisionRequestSchema.parse(raw);
    const prior = this.jobs.get(req.requestId);
    if (
      prior &&
      (prior.project.id !== req.project.id ||
        JSON.stringify(prior.change) !== JSON.stringify(req.change) ||
        !sameSpecification(prior.project, req.project))
    )
      throw new Error("Revizyon istek kimliği başka işe ait.");
    if (prior && (!req.retry || prior.status !== "failed")) return prior;
    if (req.retry && !prior)
      throw new Error("Yeniden denenecek revizyon bulunamadı.");
    if (!this.enabled) throw new Error("Builder için OPENAI_API_KEY gerekli.");
    if (this.locked)
      throw new Error("Bir Builder işi sürüyor. Tamamlanmasını bekleyin.");
    const source = resolveSource(req.project, req.change.sourceJobId);
    if (req.requestId === source.id)
      throw new Error("Revizyon yeni bir çıktı kimliği kullanmalı.");
    const screen = getScreens(getSpecification(source.project)).find(
      (s) => s.id === req.change.screenId && s.enabled,
    );
    if (!screen) throw new Error("Seçili ekran projede açık değil.");
    if (
      prior &&
      (prior.tasks[0]!.attempts >= 3 ||
        (!prior.installed && prior.setupAttempts >= 3))
    )
      throw new Error("İki yeniden deneme hakkı kullanıldı.");
    if (
      Math.max(req.project.aiCost, this.totalCost(req.project.id)) +
        builderReservationUsd >
      req.project.budgetLimit
    )
      throw new Error("Revizyon için proje bütçesi yetersiz.");
    const job: BuilderJob = prior ?? {
      id: req.requestId,
      project: req.project,
      change: req.change,
      status: "running",
      outputPath: "",
      setupAttempts: 0,
      installed: false,
      error: null,
      setupLog: "",
      createdAt: new Date().toISOString(),
      tasks: [
        {
          screenId: screen.id,
          name: screen.name,
          status: "pending",
          attempts: 0,
          costUsd: 0,
          reservedUsd: 0,
          uncertainCostUsd: 0,
          summary: "",
          limitations: [],
          log: "",
        },
      ],
    };
    this.locked = true;
    job.status = "running";
    job.error = null;
    try {
      if (!prior) {
        const destination = path.join(
          this.root,
          "workspace/generated-projects",
          job.project.id,
          job.id,
        );
        try {
          await lstat(destination);
          throw new Error("Revizyon çıktı klasörü zaten var.");
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        }
      }
      await this.persist(job);
      this.jobs.set(job.id, job);
    } catch (e) {
      this.locked = false;
      throw e;
    }
    void this.execute(job);
    return job;
  }
  private async cloneRevision(job: BuilderJob) {
    const source = path.join(
      this.root,
      "workspace/generated-projects",
      job.project.id,
      job.change!.sourceJobId,
    );
    const destination = path.join(
      this.root,
      "workspace/generated-projects",
      job.project.id,
      job.id,
    );
    await assertRealDirectory(source);
    await mkdir(destination, { recursive: true });
    await assertRealDirectory(destination);
    await cp(source, destination, {
      recursive: true,
      filter: async (file) => {
        const name = path.basename(file);
        if (
          [
            "node_modules",
            ".expo",
            ".git",
            ".npmrc",
            "credentials.json",
          ].includes(name) ||
          name.startsWith(".env") ||
          /\.(pem|key|p12|jks|keystore)$/.test(name)
        )
          return false;
        if ((await lstat(file)).isSymbolicLink())
          throw new Error("Revizyon kaynağı sembolik bağlantı içeriyor.");
        return true;
      },
    });
    await assertRealDirectory(destination);
    return { outputPath: path.relative(this.root, destination) };
  }
  private async checkedFile(directory: string, file: string) {
    const target = path.join(directory, file);
    const info = await lstat(target);
    if (!info.isFile() || (await realpath(target)) !== target)
      throw new Error("Builder dosya yolu geçersiz.");
    return target;
  }
  private async execute(job: BuilderJob) {
    try {
      if (!job.outputPath) {
        job.setupAttempts++;
        await this.persist(job);
        const result = job.change
          ? await this.cloneRevision(job)
          : await this.generate(this.root, job.project, job.id);
        job.outputPath = result.outputPath;
        await this.persist(job);
      } else if (!job.installed) {
        job.setupAttempts++;
        await this.persist(job);
      }
      const cwd = path.join(
        this.root,
        "workspace/generated-projects",
        job.project.id,
        job.id,
      );
      if (path.resolve(this.root, job.outputPath) !== cwd)
        throw new Error("Builder çıktı yolu geçersiz.");
      await assertRealDirectory(cwd);
      if (!job.installed) {
        const result = await this.command(
          "npm",
          [
            "install",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            "--fetch-retries=0",
          ],
          cwd,
        );
        job.setupLog = result.output;
        job.installed = result.exitCode === 0;
        await this.persist(job);
        if (!job.installed) throw new Error("Expo bağımlılıkları kurulamadı.");
      }
      for (const task of job.tasks) {
        if (task.status === "ready") continue;
        if (
          task.attempts >= 3 ||
          task.costUsd + task.uncertainCostUsd + builderReservationUsd >
            builderTaskLimitUsd + 0.000001
        )
          throw new Error("Ekran deneme veya görev bütçesi sınırına ulaşıldı.");
        if (
          Math.max(job.project.aiCost, this.totalCost(job.project.id)) +
            builderReservationUsd >
          job.project.budgetLimit
        )
          throw new Error("Proje bütçesi sonraki ekran için yetersiz.");
        const file = screenFile(task.screenId);
        const target = await this.checkedFile(cwd, file);
        const modules: Record<string, string> = {};
        for (const name of [
          "records.tsx",
          "screens.ts",
          "record-form.tsx",
          "ui.tsx",
          "theme.json",
          "project.json",
        ]) {
          modules["src/" + name] = await readFile(
            await this.checkedFile(cwd, "src/" + name),
            "utf8",
          );
        }
        const originalCode = await readFile(target, "utf8");
        const spec = getSpecification(job.project);
        const context = JSON.stringify({
          task: job.change ? "REVISE_SCREEN" : "BUILD_SCREEN",
          changeRequest: job.change?.instruction,
          file,
          projectMemory: {
            name: job.project.name,
            summary: spec.plan.summary,
            design: spec.design,
          },
          screen: getScreens(spec).find((s) => s.id === task.screenId),
          enabledScreens: getScreens(spec).filter((s) => s.enabled),
          notes: job.project.plannerDraft?.screenNotes.find(
            (s) => s.screenId === task.screenId,
          ),
          modules,
          currentCode: originalCode,
          requirements: screenRequirements(file),
          previousDiagnostics: task.log.slice(-8000),
        });
        let image: Buffer | undefined;
        try {
          image = await readFile(
            await this.checkedFile(
              cwd,
              `design-references/${task.screenId}.png`,
            ),
          );
        } catch (error) {
          if (!job.change || (error as NodeJS.ErrnoException).code !== "ENOENT")
            throw error;
        }
        if (Buffer.byteLength(context) > 80000)
          throw new Error("Ekran bağlamı görev sınırını aşıyor.");
        task.status = "running";
        task.log = "";
        task.attempts++;
        task.reservedUsd = builderReservationUsd;
        await this.persist(job);
        let accounted = false;
        let candidateWritten = false;
        try {
          const result = await this.run({ context, image }, this.key);
          task.costUsd += result.costUsd;
          task.reservedUsd = 0;
          accounted = true;
          task.summary = result.output.summary;
          task.limitations = result.output.limitations;
          await this.persist(job);
          // Preserve every candidate outside the Expo tree, including rejected checks.
          await writeFile(
            path.join(
              this.root,
              "workspace/builder",
              `${job.id}-${task.screenId}-${task.attempts}.txt`,
            ),
            result.output.code,
            { flag: "wx", mode: 0o600 },
          );
          validateScreenCode(result.output.code, file);
          const code = cleanScreenImports(result.output.code, file);
          validateRecordContract(code, file);
          validateRecordUsage(code, file);
          candidateWritten = true;
          await writeFile(target, code + "\n");
          task.log = "";
          for (const [label, args] of [
            [
              "TypeScript",
              [path.join(cwd, "node_modules/typescript/bin/tsc"), "--noEmit"],
            ],
            [
              "ESLint",
              [
                path.join(cwd, "node_modules/eslint/bin/eslint.js"),
                ".",
                "--max-warnings=0",
              ],
            ],
          ] as const) {
            const check = await this.command(
              process.execPath,
              [...args],
              cwd,
              120000,
            );
            task.log = (
              task.log +
              `${label}: ${check.exitCode === 0 ? "Başarılı" : "Başarısız"}\n${check.output}\n`
            ).slice(-20000);
            await this.persist(job);
            if (check.exitCode !== 0)
              throw new Error(
                `${task.name}: ${label} kontrolü başarısız. Otomatik yeniden deneme yapılmadı.`,
              );
          }
          task.status = "ready";
          await this.persist(job);
        } catch (error) {
          if (candidateWritten) await writeFile(target, originalCode);
          if (!accounted) {
            if (error instanceof PlannerError && error.costUsd !== null)
              task.costUsd += error.costUsd;
            else task.uncertainCostUsd += task.reservedUsd;
          }
          task.reservedUsd = 0;
          task.status = "failed";
          if (!task.log)
            task.log =
              error instanceof Error ? error.message : "Görev başarısız.";
          throw error;
        }
      }
      await writeFile(
        path.join(cwd, "builder-report.json"),
        JSON.stringify(
          {
            tasks: job.tasks,
            totalCostUsd: this.totalCost(job.project.id),
            note: "Kod kontrolleri tamamlandı. Cihaz testi ve görsel uyum incelemesi ayrıca gerekli.",
          },
          null,
          2,
        ),
      );
      job.status = "ready";
    } catch (error) {
      job.status = "failed";
      job.error =
        error instanceof Error ? error.message : "Builder tamamlanamadı.";
    } finally {
      try {
        await this.persist(job);
      } catch {
        job.status = "failed";
        job.error = "Builder iş kaydı yazılamadı.";
      }
      this.locked = false;
    }
  }
}
