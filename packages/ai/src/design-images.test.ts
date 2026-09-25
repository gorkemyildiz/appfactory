import { test } from "node:test";
import assert from "node:assert/strict";
import { designImagePrompt, generateDesignImage } from "./design-images";
import { PlannerError } from "./index";
import { type Project } from "@app-factory/schemas";
const project: Project = {
  id: "test",
  name: "Test",
  idea: "Alışkanlık takibi için mobil uygulama.",
  type: "mobile",
  android: true,
  ios: false,
  budgetLimit: 1,
  aiCost: 0,
  stage: "design",
  updatedAt: new Date().toISOString(),
};
test("image request is bounded, returns a PNG and accounts for tokens", async () => {
  const png = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(1024, 16);
  png.writeUInt32BE(1536, 20);
  let calls = 0;
  const result = await generateDesignImage(
    designImagePrompt(project, "home", "Sıcak renkler"),
    "test",
    async (url, init) => {
      calls++;
      assert.equal(url, "https://api.openai.com/v1/images/generations");
      const body = JSON.parse(init?.body as string);
      assert.equal(body.n, 1);
      assert.equal(body.size, "1024x1536");
      assert.equal(body.quality, "medium");
      assert.ok(body.prompt.includes("Sıcak renkler"));
      return Response.json({
        data: [{ b64_json: png.toString("base64") }],
        usage: { input_tokens: 1000, output_tokens: 1000 },
      });
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.costUsd, 0.0175);
  assert.deepEqual(result.png, png);
});
test("image errors are safe and never retry automatically", async () => {
  let calls = 0;
  await assert.rejects(
    generateDesignImage("test", "secret", async () => {
      calls++;
      return new Response("secret", { status: 403 });
    }),
    (e) =>
      e instanceof PlannerError &&
      e.costUsd === 0 &&
      !e.message.includes("secret"),
  );
  assert.equal(calls, 1);
  await assert.rejects(
    generateDesignImage("test", "secret", async () =>
      Response.json({
        data: [{ b64_json: Buffer.from("not png").toString("base64") }],
      }),
    ),
    /doğrulanamadı/,
  );
  assert.throws(() => designImagePrompt(project, "register", ""), /Seçili/);
});
