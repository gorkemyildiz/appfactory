import assert from "node:assert/strict";
import { test } from "node:test";
import { projectInputSchema, storedProjectsSchema } from "./index";
const valid = {
  name: "Test app",
  type: "mobile",
  android: true,
  ios: false,
  idea: "A focused habit tracker for everyday personal use.",
  budgetLimit: 10,
};
test("accepts mobile projects and trims user input", () => {
  const value = projectInputSchema.parse({ ...valid, name: "  Test app  " });
  assert.equal(value.name, "Test app");
});
test("requires at least one target platform", () => {
  assert.equal(
    projectInputSchema.safeParse({ ...valid, android: false }).success,
    false,
  );
  assert.equal(
    projectInputSchema.safeParse({ ...valid, android: false, ios: true })
      .success,
    true,
  );
});
test("rejects invalid budgets, ideas, names and project types", () => {
  for (const change of [
    { budgetLimit: NaN },
    { budgetLimit: Infinity },
    { budgetLimit: 0 },
    { budgetLimit: -1 },
    { budgetLimit: 1001 },
    { idea: "short" },
    { name: " " },
    { type: "game" },
  ])
    assert.equal(
      projectInputSchema.safeParse({ ...valid, ...change }).success,
      false,
    );
});
test("rejects corrupt persisted projects", () => {
  assert.equal(
    storedProjectsSchema.safeParse({
      version: 1,
      projects: [
        {
          ...valid,
          id: "a",
          stage: "unknown",
          aiCost: 0,
          updatedAt: "invalid",
        },
      ],
    }).success,
    false,
  );
});
