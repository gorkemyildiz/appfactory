import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
const activeChildren = new Set<ChildProcess>();
function terminate(child: ChildProcess) {
  try {
    if (child.pid && process.platform !== "win32")
      process.kill(-child.pid, "SIGKILL");
    else child.kill("SIGKILL");
  } catch {
    /* Process already exited. */
  }
}
export function stopCommands() {
  for (const child of activeChildren) terminate(child);
}
export type CommandResult = {
  output: string;
  exitCode: number | null;
  durationMs: number;
};
export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = 360_000,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    let output = "";
    let timedOut = false;
    let settled = false;
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      TMPDIR: process.env.TMPDIR,
      CI: "1",
      EXPO_NO_TELEMETRY: "1",
      FORCE_COLOR: "0",
      ...(process.platform === "win32"
        ? {
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
            USERPROFILE: process.env.USERPROFILE,
            LOCALAPPDATA: process.env.LOCALAPPDATA,
            APPDATA: process.env.APPDATA,
          }
        : {}),
    };
    // Windows command shims cannot be spawned with shell:false. Run npm's
    // JavaScript entry point directly so arguments never pass through a shell.
    if (process.platform === "win32" && /^(npm|npm\.cmd)$/.test(command)) {
      const candidates = [
        path.dirname(process.execPath),
        ...(process.env.PATH ?? "").split(path.delimiter),
      ].map((directory) =>
        path.join(directory, "node_modules/npm/bin/npm-cli.js"),
      );
      const cli = candidates.find((file) => existsSync(file));
      if (!cli) {
        resolve({
          output: "npm CLI bulunamadı.",
          exitCode: null,
          durationMs: Date.now() - start,
        });
        return;
      }
      command = process.execPath;
      args = [cli, ...args];
    }
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    activeChildren.add(child);
    const append = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-20_000);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      activeChildren.delete(child);
      clearTimeout(timer);
      resolve({
        exitCode,
        output: output + (timedOut ? "\nİşlem zaman aşımına uğradı." : ""),
        durationMs: Date.now() - start,
      });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (child.pid && process.platform !== "win32")
          process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {
        /* Child may already be finished. */
      }
    }, timeoutMs);
    child.on("error", (error) => {
      output = error.message;
      finish(null);
    });
    child.on("close", (code) => finish(timedOut ? null : code));
  });
}
