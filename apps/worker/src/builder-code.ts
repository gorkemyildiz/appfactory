import ts from "typescript";
export const screenFiles = {
  home: "app/index.tsx",
  create: "app/create.tsx",
  details: "app/items/[id].tsx",
  settings: "app/settings.tsx",
  register: "app/register.tsx",
} as const;
export function validateScreenCode(code: string, file: string) {
  if (/eslint-disable|@ts-ignore|@ts-nocheck|@ts-expect-error/.test(code))
    throw new Error(
      "Kod kontrolünü devre dışı bırakan yönergeler kabul edilmez.",
    );
  const prefix = file.includes("/items/") ? "../../src/" : "../src/";
  const allowed = new Set([
    "react",
    "react-native",
    "expo-router",
    ...[
      "records",
      "screens",
      "ui",
      "record-form",
      "theme.json",
      "project.json",
    ].map((s) => prefix + s),
  ]);
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let hasDefault = false;
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (
        node.moduleSpecifier &&
        (!ts.isStringLiteral(node.moduleSpecifier) ||
          !allowed.has(node.moduleSpecifier.text))
      )
        throw new Error("Ekran izin verilen modüllerin dışına çıkıyor.");
    }
    if (
      ts.isIdentifier(node) &&
      [
        "Image",
        "ImageBackground",
        "require",
        "eval",
        "Function",
        "process",
        "globalThis",
        "fetch",
        "XMLHttpRequest",
        "WebSocket",
        "Linking",
        "WebView",
      ].includes(node.text)
    )
      throw new Error(
        `Desteklenmeyen özellik: ${node.text}. Görsel dosyası envanteri boş; mevcut olmayan dosyalara başvurmayın.`,
      );
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    )
      throw new Error("Dinamik modül yükleme desteklenmiyor.");
    if (
      ts.canHaveModifiers(node) &&
      ts
        .getModifiers(node)
        ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
    )
      hasDefault = true;
    if (ts.isExportAssignment(node) && !node.isExportEquals) hasDefault = true;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!hasDefault) throw new Error("Ekran default export içermeli.");
}

// Use the compiler's own import organizer; do not rewrite bindings by regex.
export function cleanScreenImports(code: string, file: string) {
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => ({
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ESNext,
      noLib: true,
    }),
    getScriptFileNames: () => [file],
    getScriptVersion: () => "1",
    getScriptSnapshot: (name) =>
      name === file ? ts.ScriptSnapshot.fromString(code) : undefined,
    getCurrentDirectory: () => "/",
    getDefaultLibFileName: () => "lib.d.ts",
    fileExists: (name) => name === file,
    readFile: (name) => (name === file ? code : undefined),
  };
  const service = ts.createLanguageService(host);
  try {
    const edits = service.organizeImports(
      { type: "file", fileName: file },
      {},
      {},
    );
    const changes = edits
      .filter((edit) => edit.fileName === file)
      .flatMap((edit) => edit.textChanges)
      .sort((a, b) => b.span.start - a.span.start);
    for (const change of changes)
      code =
        code.slice(0, change.span.start) +
        change.newText +
        code.slice(change.span.start + change.span.length);
    return code;
  } finally {
    service.dispose();
  }
}

// This catches a dropped storage connection, not complete behavioral equivalence.
// Device tests and visual review are still required after compiler/linter success.
export function validateRecordContract(code: string, file: string) {
  if (file === screenFiles.register) return;
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const prefix =
    file === screenFiles.details ? "../../src/records" : "../src/records";
  const hooks = new Set<string>();
  for (const node of source.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      node.moduleSpecifier.text !== prefix
    )
      continue;
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings))
      for (const item of bindings.elements)
        if ((item.propertyName?.text ?? item.name.text) === "useRecords")
          hooks.add(item.name.text);
  }
  let called = false;
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      hooks.has(node.expression.text)
    )
      called = true;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!called)
    throw new Error(
      "Ekran mevcut yerel kayıt bağlantısını kaldırdı (useRecords). Örnek veriler çalışan kayıtların yerine geçemez.",
    );
}

export function screenRequirements(file: string) {
  const required =
    file === screenFiles.home
      ? ["records", "ready", "error"]
      : file === screenFiles.create
        ? ["add", "ready", "error"]
        : file === screenFiles.details
          ? ["records", "ready", "error", "update"]
          : file === screenFiles.settings
            ? ["records"]
            : [];
  return {
    requiredRecordFields: required,
    availableImageAssets: [],
    rules: [
      "Use every requiredRecordField from useRecords in the actual screen behavior, not just an unused hook call.",
      "No Image/ImageBackground, require or asset paths: no illustration files are available. Use native View shapes for decoration.",
      "Never recreate sample values from the image. Render actual records and an empty state when none exist.",
      "Keep enabled-route conditions, loading/error states and existing add/update behavior from currentCode.",
    ],
  };
}

export function validateRecordUsage(code: string, file: string) {
  const required = screenRequirements(file).requiredRecordFields;
  if (!required.length) return;
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const aliases = new Set<string>();
  for (const node of source.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      !node.moduleSpecifier.text.endsWith("/src/records")
    )
      continue;
    const names = node.importClause?.namedBindings;
    if (names && ts.isNamedImports(names))
      for (const name of names.elements)
        if ((name.propertyName?.text ?? name.name.text) === "useRecords")
          aliases.add(name.name.text);
  }
  const bindings = new Map<string, ts.Identifier>();
  function collect(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      aliases.has(node.initializer.expression.text)
    ) {
      for (const item of node.name.elements)
        if (ts.isIdentifier(item.name))
          bindings.set(
            item.propertyName?.getText(source) ?? item.name.text,
            item.name,
          );
    }
    ts.forEachChild(node, collect);
  }
  collect(source);
  for (const field of required) {
    const binding = bindings.get(field);
    let used = false;
    function visit(node: ts.Node) {
      if (
        binding &&
        ts.isIdentifier(node) &&
        node !== binding &&
        node.text === binding.text
      ) {
        const parent = node.parent;
        if (
          !(ts.isPropertyAccessExpression(parent) && parent.name === node) &&
          !(ts.isPropertyAssignment(parent) && parent.name === node)
        )
          used = true;
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    if (!used)
      throw new Error(
        `Yerel kayıt alanı kullanılmıyor: ${field}. Görseldeki örnek veriler yerine mevcut kayıt akışını koruyun.`,
      );
  }
}
