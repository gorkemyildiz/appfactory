import { spawn, type ChildProcess } from "node:child_process";
const children = new Set<ChildProcess>();
function terminate(child: ChildProcess) {
  try {
    if (child.pid && process.platform !== "win32")
      process.kill(-child.pid, "SIGKILL");
    else child.kill("SIGKILL");
  } catch {
    /* Already exited. */
  }
}
export function stopEasCommands() {
  for (const child of children) terminate(child);
}
export type EasCommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};
export function easEnvironment(cwd: string, token: string): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    EXPO_TOKEN: token,
    EAS_NO_VCS: "1",
    EAS_PROJECT_ROOT: cwd,
    EXPO_NO_TELEMETRY: "1",
    CI: "1",
    FORCE_COLOR: "0",
  };
}
export function runEas(
  args: string[],
  cwd: string,
  token: string,
): Promise<EasCommandResult> {
  return new Promise((resolve) => {
    const entry = process.env.EAS_CLI_PATH;
    const child = spawn(
      entry ? process.execPath : "eas",
      entry ? [entry, ...args] : args,
      {
        cwd,
        env: easEnvironment(cwd, token),
        shell: false,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    children.add(child);
    let stdout = "",
      stderr = "",
      done = false;
    const redact = (s: string) => s.split(token).join("[REDACTED]");
    child.stdout.on("data", (b: Buffer) => {
      stdout += b.toString();
      if (stdout.length > 2_000_000) terminate(child);
    });
    child.stderr.on("data", (b: Buffer) => {
      stderr += b.toString();
      if (stderr.length > 2_000_000) terminate(child);
    });
    const timer = setTimeout(() => {
      stderr += "\nEAS komutu zaman aşımına uğradı.";
      terminate(child);
    }, 300000);
    function finish(code: number | null) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      children.delete(child);
      resolve({ code, stdout: redact(stdout), stderr: redact(stderr) });
    }
    child.on("error", () => {
      stderr =
        "EAS CLI başlatılamadı. Kurulumu ve EAS_CLI_PATH ayarını kontrol edin.";
      finish(null);
    });
    child.on("close", finish);
  });
}
export function parseEasJson(text: string): unknown {
  // CLI warnings may precede JSON. Only accept a complete JSON suffix.
  for (let i = 0; i < text.length; i++)
    if (text[i] === "{" || text[i] === "[") {
      try {
        return JSON.parse(text.slice(i));
      } catch {
        /* Try next opening. */
      }
    }
  throw new Error("EAS yanıtı okunamadı.");
}
