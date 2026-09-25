import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getSpecification,
  reviseProject,
  sameSpecification,
  designSchema,
  type Project,
} from "./index";
const project: Project = {
  id: "spec-test",
  name: "Test",
  type: "mobile",
  android: true,
  ios: false,
  idea: "Yerel kayıtları saklayan örnek uygulama.",
  budgetLimit: 10,
  stage: "build",
  aiCost: 0,
  updatedAt: new Date().toISOString(),
};
test("legacy projects get defaults and edits invalidate only required approvals", () => {
  const initial = getSpecification(project);
  assert.equal(initial.revision, 0);
  const design = reviseProject(
    project,
    "design",
    { ...initial.design, primary: "#336699" },
    0,
  );
  assert.equal(design.stage, "design");
  assert.equal(design.specification?.revision, 1);
  assert.equal(design.revisions?.[0]?.specification.revision, 0);
  assert.equal(sameSpecification(project, design), false);
  const plan = reviseProject(
    design,
    "plan",
    { ...initial.plan, summary: "Düzenlenmiş proje özeti ve yeni hedefler." },
    1,
  );
  assert.equal(plan.stage, "plan");
  assert.equal(plan.specification?.revision, 2);
  assert.equal(plan.revisions?.length, 2);
});
test("no-op saves do not invalidate approvals; stale edits cannot overwrite a newer revision", () => {
  assert.equal(
    reviseProject(project, "design", getSpecification(project).design, 0),
    project,
  );
  assert.throws(
    () => reviseProject(project, "design", getSpecification(project).design, 1),
    /başka bir sekmede/,
  );
});
test("invalid theme values are rejected and history remains bounded", () => {
  assert.equal(
    designSchema.safeParse({
      ...getSpecification(project).design,
      primary: "red",
    }).success,
    false,
  );
  assert.equal(
    designSchema.safeParse({ ...getSpecification(project).design, spacing: 0 })
      .success,
    false,
  );
  let current = project;
  for (let i = 0; i < 25; i++)
    current = reviseProject(
      current,
      "plan",
      {
        ...getSpecification(current).plan,
        summary: `Yeni düzenleme için yeterli uzunlukta özet ${i}.`,
      },
      i,
    );
  assert.equal(current.revisions?.length, 20);
  assert.equal(current.specification?.revision, 25);
});

test("visual approval requires all four screens and the current revision", async () => {
  const { approveVisualDesign, previewScreenIds } = await import("./index");
  const designProject = { ...project, stage: "design" as const };
  assert.throws(() =>
    approveVisualDesign(designProject, ["home", "create"], 0),
  );
  assert.throws(() =>
    approveVisualDesign(designProject, ["home", "home", "home", "home"], 0),
  );
  assert.throws(
    () => approveVisualDesign(designProject, previewScreenIds, 1),
    /Sürüm değişti/,
  );
  const approved = approveVisualDesign(designProject, previewScreenIds, 0);
  assert.equal(approved.stage, "development");
  assert.equal(approved.designReview?.revision, 0);
  assert.equal(approved.designReview?.screens.length, 4);
  const revised = reviseProject(
    approved,
    "design",
    { ...getSpecification(approved).design, radius: 12 },
    0,
  );
  assert.equal(revised.designReview, undefined);
  assert.equal(revised.stage, "design");
});

test("screen selection requires home and visual approval of exactly selected screens", async () => {
  const { getScreens, screensSchema, approveVisualDesign } =
    await import("./index");
  const screens = getScreens(getSpecification(project)).map((s) => ({
    ...s,
    enabled: s.id === "home" || s.id === "register",
  }));
  assert.equal(
    screensSchema.safeParse(screens.map((s) => ({ ...s, enabled: false })))
      .success,
    false,
  );
  assert.equal(
    screensSchema.safeParse([...screens.slice(0, 4), screens[0]]).success,
    false,
  );
  const edited = reviseProject(project, "screens", screens, 0);
  assert.equal(edited.stage, "screens");
  assert.equal(edited.specification?.revision, 1);
  const design = { ...edited, stage: "design" as const };
  assert.throws(() => approveVisualDesign(design, ["home"], 1));
  assert.throws(() =>
    approveVisualDesign(design, ["home", "register", "settings"], 1),
  );
  assert.equal(
    approveVisualDesign(design, ["home", "register"], 1).stage,
    "development",
  );
  assert.equal(reviseProject(edited, "screens", screens, 1), edited);
});
