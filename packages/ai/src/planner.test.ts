import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getSpecification,
  getScreens,
  type Project,
} from "@app-factory/schemas";
import { runPlanner, reservation, PlannerError, outputSchema } from "./index";
const input: Project = {
  id: "ai-test",
  name: "Test",
  idea: "Alışkanlık takibi için basit bir mobil uygulama.",
  type: "mobile",
  android: true,
  ios: false,
  budgetLimit: 1,
  stage: "plan",
  aiCost: 0,
  updatedAt: new Date().toISOString(),
};
const spec = getSpecification(input);
export const output = {
  plan: spec.plan,
  screens: getScreens(spec),
  design: spec.design,
  screenNotes: [],
  tasks: [
    {
      title: "Takip",
      description: "Takip ekranı geliştir.",
      acceptance: ["Kayıt tutulur."],
    },
  ],
  limitations: ["Kod henüz üretilmedi."],
};
test("Planner sends minimal context and structured output, accounts for usage", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(options?.body as string);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.input.includes("revisions"), false);
    assert.equal(body.input.includes("budgetLimit"), false);
    return Response.json({
      status: "completed",
      usage: { input_tokens: 1000, output_tokens: 1000 },
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                ...output,
                screens: Object.fromEntries(
                  output.screens.map(({ id, ...screen }) => [id, screen]),
                ),
              }),
            },
          ],
        },
      ],
    });
  };
  const result = await runPlanner(input, "test-key", transport);
  assert.equal(calls, 1);
  assert.equal(result.costUsd, 0.002);
  assert.deepEqual(result.output, output);
  assert.ok(reservation(input) > result.costUsd);
});
test("malformed, incomplete and refused results never get applied; no automatic retries", async () => {
  for (const payload of [
    { status: "incomplete", usage: { input_tokens: 100, output_tokens: 100 } },
    {
      status: "completed",
      usage: { input_tokens: 100, output_tokens: 100 },
      output: [{ type: "message", content: [{ type: "refusal" }] }],
    },
    {
      status: "completed",
      usage: { input_tokens: 100, output_tokens: 100 },
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: '{"plan":"invalid"}' }],
        },
      ],
    },
  ]) {
    let calls = 0;
    await assert.rejects(
      runPlanner(input, "test", async () => {
        calls++;
        return Response.json(payload);
      }),
      PlannerError,
    );
    assert.equal(calls, 1);
  }
});
test("network failures reserve uncertain costs and provider errors do not leak response bodies", async () => {
  await assert.rejects(
    runPlanner(input, "secret", async () => {
      throw new Error("secret");
    }),
    (e) =>
      e instanceof PlannerError &&
      e.costUsd === null &&
      !e.message.includes("secret"),
  );
  await assert.rejects(
    runPlanner(
      input,
      "secret",
      async () => new Response("secret", { status: 401 }),
    ),
    (e) =>
      e instanceof PlannerError &&
      e.costUsd === 0 &&
      !e.message.includes("secret"),
  );
});

test("provider schema shares local bounds and fixes screen identity", () => {
  const schema = JSON.parse(JSON.stringify(outputSchema));
  assert.equal(schema.properties.plan.properties.summary.minLength, 20);
  assert.equal(schema.properties.tasks.maxItems, 15);
  assert.equal(schema.properties.design.properties.radius.maximum, 24);
  assert.equal(
    schema.properties.design.properties.primary.pattern,
    "^#[0-9a-fA-F]{6}$",
  );
  assert.deepEqual(schema.properties.screens.required, [
    "home",
    "create",
    "details",
    "settings",
    "register",
  ]);
  assert.equal(
    schema.properties.screens.properties.home.properties.enabled.const,
    true,
  );
  assert.equal(
    schema.properties.screens.properties.create.properties.name.maxLength,
    60,
  );
});
test("validation failures identify fields without leaking generated contents", async () => {
  const invalid = {
    ...output,
    screens: Object.fromEntries(
      output.screens.map(({ id, ...screen }) => [id, screen]),
    ),
    design: { ...output.design, radius: 99 },
  };
  await assert.rejects(
    runPlanner(input, "test", async () =>
      Response.json({
        status: "completed",
        usage: { input_tokens: 100, output_tokens: 100 },
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(invalid) }],
          },
        ],
      }),
    ),
    (e) =>
      e instanceof PlannerError &&
      e.message.includes("design.radius") &&
      e.costUsd === 0.0002,
  );
});
