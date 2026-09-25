export type CloudRow<T> = { document: T; version: number };
export type PendingProject<T> = { document: T; expectedVersion: number };
export interface ProjectRepository<T> {
  list(): Promise<CloudRow<T>[]>;
  save(document: T, expectedVersion: number): Promise<CloudRow<T>>;
}

/** One writer per browser session; failed saves remain in a durable outbox. */
export class ProjectSync<T extends { id: string }> {
  private rows = new Map<string, CloudRow<T>>();
  private pending = new Map<string, PendingProject<T>>();
  private running = false;
  private stopped = false;
  constructor(
    private repository: ProjectRepository<T>,
    pending: PendingProject<T>[],
    private persist: (pending: PendingProject<T>[]) => void,
    private changed: (
      projects: T[],
      status: "synced" | "saving" | "error",
      error?: string,
    ) => void,
  ) {
    for (const item of pending) this.pending.set(item.document.id, item);
  }
  stop() {
    this.stopped = true;
  }
  private notify(status: "synced" | "saving" | "error", error?: string) {
    if (this.stopped) return;
    const projects = new Map(
      [...this.rows].map(([id, row]) => [id, row.document]),
    );
    for (const [id, item] of this.pending) projects.set(id, item.document);
    this.changed([...projects.values()], status, error);
  }
  async refresh() {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      const rows = await this.repository.list();
      if (this.stopped) return;
      this.rows = new Map(rows.map((row) => [row.document.id, row]));
      this.notify(this.pending.size ? "saving" : "synced");
    } catch (error) {
      this.notify(
        "error",
        error instanceof Error
          ? error.message
          : "Supabase kayıtları alınamadı. Bağlantıyı ve veritabanı kurulumunu kontrol edin.",
      );
      return;
    } finally {
      this.running = false;
    }
    await this.flush();
  }
  enqueue(projects: T[]) {
    if (this.stopped) throw new Error("Oturum değişti. Yeniden giriş yapın.");
    const next = new Map(this.pending);
    for (const document of projects) {
      const previous = next.get(document.id);
      if (
        JSON.stringify(
          previous?.document ?? this.rows.get(document.id)?.document,
        ) === JSON.stringify(document)
      )
        continue;
      next.set(document.id, {
        document,
        expectedVersion:
          previous?.expectedVersion ?? this.rows.get(document.id)?.version ?? 0,
      });
    }
    // Storage failure must prevent reporting the edit as queued successfully.
    this.persist([...next.values()]);
    this.pending = next;
    this.notify(this.pending.size ? "saving" : "synced");
    void this.flush();
  }
  async flush() {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      while (this.pending.size && !this.stopped) {
        const [id, item] = this.pending.entries().next().value!;
        const saved = await this.repository.save(
          item.document,
          item.expectedVersion,
        );
        if (this.stopped) return;
        const next = new Map(this.pending);
        if (next.get(id) === item) next.delete(id);
        else next.set(id, { ...next.get(id)!, expectedVersion: saved.version });
        this.persist([...next.values()]);
        this.pending = next;
        this.rows.set(id, saved);
        this.notify(this.pending.size ? "saving" : "synced");
      }
    } catch (error) {
      this.notify(
        "error",
        error instanceof Error
          ? error.message
          : "Buluta kaydedilemedi; değişiklik bu tarayıcıda bekliyor.",
      );
    } finally {
      this.running = false;
    }
  }
}
