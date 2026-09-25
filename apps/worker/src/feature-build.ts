import {
  cp,
  mkdir,
  readFile,
  writeFile,
  rm,
  lstat,
  realpath,
} from "node:fs/promises";
import path from "node:path";
import { assertRealDirectory } from "@app-factory/generator";
import {
  getSpecification,
  getScreens,
  type Project,
  type FeatureOutput,
} from "@app-factory/schemas";

export async function prepareApplication(root: string, cwd: string) {
  await assertRealDirectory(cwd);
  await mkdir(path.join(cwd, "src/runtime"), { recursive: true });
  await assertRealDirectory(path.join(cwd, "src/runtime"));
  await cp(
    path.join(root, "templates/expo-features"),
    path.join(cwd, "src/runtime"),
    { recursive: true },
  );
  const manifest = JSON.parse(
    await readFile(path.join(cwd, "package.json"), "utf8"),
  );
  Object.assign(manifest.dependencies, {
    "expo-location": "~57.0.20",
    "expo-image-picker": "~57.0.20",
    "react-native-maps": "1.27.2",
    "@supabase/supabase-js": "2.117.1",
    "react-native-url-polyfill": "2.0.0",
  });
  await writeFile(
    path.join(cwd, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  const config = JSON.parse(await readFile(path.join(cwd, "app.json"), "utf8"));
  config.expo.plugins = config.expo.plugins.filter(
    (plugin: string | [string, unknown]) =>
      !["expo-location", "expo-image-picker"].includes(
        typeof plugin === "string" ? plugin : plugin[0],
      ),
  );
  config.expo.plugins.push(
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Yakınınızdaki içerikleri göstermek için konumunuza izin verin.",
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      "expo-image-picker",
      {
        cameraPermission:
          "Fotoğraf çekerek paylaşmak için kameraya izin verin.",
        photosPermission: false,
        microphonePermission: false,
      },
    ],
  );
  await writeFile(
    path.join(cwd, "app.json"),
    JSON.stringify(config, null, 2) + "\n",
  );
  const layoutPath = path.join(cwd, "app/_layout.tsx");
  let layout = await readFile(layoutPath, "utf8");
  if (!layout.includes('from "../src/features/store"')) {
    layout = 'import { AppProvider } from "../src/features/store";\n' + layout;
    // Keep the legacy provider while screens are replaced one at a time.
    layout = layout
      .replace("<RecordsProvider>", "<AppProvider><RecordsProvider>")
      .replace("</RecordsProvider>", "</RecordsProvider></AppProvider>");
  }
  await writeFile(layoutPath, layout);
}

export async function featureContext(
  cwd: string,
  project: Project,
  diagnostics: string,
) {
  const modules: Record<string, string> = {};
  for (const name of ["runtime.ts", "map.tsx"])
    modules[`src/runtime/${name}`] = await readFile(
      path.join(cwd, "src/runtime", name),
      "utf8",
    );
  const spec = getSpecification(project);
  return JSON.stringify({
    task: "BUILD_APPLICATION_FEATURES",
    projectMemory: {
      name: project.name,
      idea: project.idea,
      plan: spec.plan,
      screens: getScreens(spec).filter((s) => s.enabled),
      tasks: project.plannerDraft?.tasks,
      screenNotes: project.plannerDraft?.screenNotes,
    },
    modules,
    files: [
      "src/features/models.ts",
      "src/features/domain.ts",
      "src/features/store.tsx",
      "src/features/services.ts",
    ],
    previousDiagnostics: diagnostics.slice(-8000),
  });
}

export async function applicationModules(cwd: string) {
  const files: Record<string, string> = {};
  for (const file of [
    "features/models.ts",
    "features/domain.ts",
    "features/store.tsx",
    "features/services.ts",
    "runtime/runtime.ts",
    "runtime/map.tsx",
  ]) {
    const target = path.join(cwd, "src", file);
    if (!(await lstat(target)).isFile() || (await realpath(target)) !== target)
      throw new Error("Uygulama modül yolu geçersiz.");
    files[`src/${file}`] = await readFile(target, "utf8");
  }
  return files;
}

export async function writeFeatureCandidate(
  cwd: string,
  output: FeatureOutput,
) {
  const files = [
    ...output.files,
    { path: "backend/migration.sql", code: output.migrationSql },
    {
      path: "FEATURE-SETUP.md",
      code:
        "# Uygulama kurulumu\n\n" +
        output.setup.map((step) => `- ${step}`).join("\n") +
        "\n\nMigration otomatik uygulanmadı. Ayrı uygulama veritabanında SQL ve erişim politikalarını inceleyip uygulayın. Mobil bağlantı için src/runtime/connection.json dosyasına yalnızca HTTPS URL ve publishable anahtarı ekleyin. App Factory hesabı/anahtarları aktarılmaz. Android harita dağıtımı için Google Maps anahtarı ve uygulama kısıtları ayrıca yapılandırılmalıdır.\n",
    },
    { path: "feature-tests.json", code: JSON.stringify(output.tests, null, 2) },
  ];
  const originals = new Map<string, string | null>();
  const rollback = async () => {
    for (const [target, original] of originals) {
      if (original === null) await rm(target, { force: true });
      else await writeFile(target, original);
    }
  };
  try {
    for (const file of files) {
      const target = path.join(cwd, file.path);
      await mkdir(path.dirname(target), { recursive: true });
      await assertRealDirectory(path.dirname(target));
      try {
        if (
          !(await lstat(target)).isFile() ||
          (await realpath(target)) !== target
        )
          throw new Error("Uygulama dosya yolu geçersiz.");
        originals.set(target, await readFile(target, "utf8"));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        originals.set(target, null);
      }
      await writeFile(target, file.code + "\n");
    }
  } catch (error) {
    await rollback();
    throw error;
  }
  return rollback;
}
