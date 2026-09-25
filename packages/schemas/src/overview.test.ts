import assert from "node:assert/strict";
import { test } from "node:test";
import {
  editProjectOverview,
  getSpecification,
  sameSpecification,
  projectSchema,
  type Project,
} from "./index";

const project: Project = {
  id: "overview-test",
  name: "Test",
  type: "mobile",
  android: true,
  ios: false,
  idea: "Yerel kayıtları saklayan örnek uygulama.",
  budgetLimit: 10,
  stage: "build",
  aiCost: 2,
  updatedAt: "2026-09-25T10:00:00.000Z",
};

test("overview content edits reopen the plan and retain authored work and costs", () => {
  const current: Project = {
    ...project,
    specification: getSpecification(project),
    plannerJobId: "old-job",
    designReview: {
      revision: 0,
      screens: ["home"],
      reviewedAt: project.updatedAt,
    },
  };
  for (const change of [
    { idea: "Yeni bir alışveriş listesi hazırlayan uygulama." },
    { name: "Yeni ad" },
    { ios: true },
  ]) {
    const next = editProjectOverview(
      current,
      { ...current, ...change },
      current,
    );
    assert.equal(next.stage, "plan");
    assert.equal(next.specification?.revision, 1);
    assert.deepEqual(next.specification?.plan, current.specification?.plan);
    assert.deepEqual(next.specification?.design, current.specification?.design);
    assert.equal(next.designReview, undefined);
    assert.equal(next.plannerJobId, undefined);
    assert.equal(next.aiCost, 2);
    assert.equal(sameSpecification(next, current), false);
    assert.equal(next.revisions?.length, 1);
    projectSchema.parse(next);
  }
});

test("budget-only edits and no-op saves preserve progress and approvals", () => {
  assert.equal(editProjectOverview(project, project, project), project);
  const next = editProjectOverview(
    project,
    { ...project, budgetLimit: 20 },
    project,
  );
  assert.equal(next.stage, "build");
  assert.equal(sameSpecification(next, project), true);
  assert.equal(next.aiCost, 2);
  assert.equal(next.budgetLimit, 20);
});

test("legacy idea edits update the generated summary without advancing idea stage", () => {
  const current = { ...project, stage: "idea" as const };
  const idea = "Günlük alışkanlıkları takip eden yeni bir uygulama.";
  const next = editProjectOverview(current, { ...current, idea }, current);
  assert.equal(next.stage, "idea");
  assert.equal(getSpecification(next).plan.summary, idea);
});

test("stale overview edits and invalid inputs cannot overwrite newer state", () => {
  for (const current of [
    { ...project, budgetLimit: 20 },
    { ...project, stage: "plan" as const },
    {
      ...project,
      specification: { ...getSpecification(project), revision: 1 },
    },
  ])
    assert.throws(
      () => editProjectOverview(current, project, project),
      /Proje değişti/,
    );
  for (const change of [
    { idea: "kısa" },
    { android: false, ios: false },
    { budgetLimit: NaN },
  ])
    assert.throws(() =>
      editProjectOverview(project, { ...project, ...change }, project),
    );
  const next = editProjectOverview(
    { ...project, aiCost: 3 },
    { ...project, budgetLimit: 20 },
    project,
  );
  assert.equal(next.aiCost, 3);
});
