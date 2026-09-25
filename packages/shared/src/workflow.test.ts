import assert from "node:assert/strict";
import { test } from "node:test";
import { transition, MAX_RETRIES, progress } from "./index";
test("requires sequential approvals before development", () => {
  let stage = transition("idea", "CREATE_PLAN");
  assert.equal(stage, "plan");
  stage = transition(stage, "APPROVE_PLAN");
  assert.equal(stage, "screens");
  stage = transition(stage, "APPROVE_SCREENS");
  assert.equal(stage, "design");
  assert.equal(transition(stage, "APPROVE_DESIGN"), "development");
});
test("rejects skipped and repeated approvals", () => {
  assert.throws(() => transition("idea", "APPROVE_DESIGN"));
  assert.throws(() => transition("screens", "APPROVE_PLAN"));
  assert.throws(() => transition("development", "APPROVE_DESIGN"));
});
test("does not imply builds completed and caps retries", () => {
  assert.equal(MAX_RETRIES, 2);
  assert.equal(progress("idea"), 0);
  assert.ok(progress("build") < 100);
});

test("navigation permits only completed and current stages, including after rollback", async () => {
  const { canAccessStage, stages } = await import("./index");
  for (const [currentIndex, current] of stages.entries()) {
    assert.equal(canAccessStage(current, "overview"), true);
    for (const [targetIndex, target] of stages.entries())
      assert.equal(
        canAccessStage(current, target),
        targetIndex <= currentIndex,
      );
  }
  assert.equal(canAccessStage("design", "build"), false);
  assert.equal(canAccessStage("tests", "build"), false);
});
