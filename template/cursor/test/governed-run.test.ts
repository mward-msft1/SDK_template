import assert from "node:assert/strict";
import test from "node:test";
import {
  runGovernedTurn,
  type ModelResult,
  type PolicyGate,
  type Telemetry
} from "../src/governed-run.js";

function telemetry(): Telemetry {
  return {
    runGuardrail: (_target, operation) => operation(),
    runInference: (operation) => operation(),
    recordOutput: () => undefined,
    recordError: () => undefined,
    finish: () => undefined
  };
}

function policy(inputBlock = false, outputBlock = false): PolicyGate {
  return {
    computeProtectionScopes: async () => ({}),
    evaluate: async (activity) => ({
      block: activity === "uploadText" ? inputBlock : outputBlock
    })
  };
}

const model = async (): Promise<ModelResult> => ({ text: "safe response" });

test("returns output only after both policy checks allow it", async () => {
  const result = await runGovernedTurn({
    prompt: "hello",
    correlationId: "turn-1",
    blockOnError: true,
    policy: policy(),
    telemetry: telemetry(),
    invokeModel: model
  });
  assert.deepEqual(result, { status: "allowed", text: "safe response" });
});

test("does not invoke Cursor when Purview blocks the input", async () => {
  let invoked = false;
  const result = await runGovernedTurn({
    prompt: "blocked",
    correlationId: "turn-2",
    blockOnError: true,
    policy: policy(true),
    telemetry: telemetry(),
    invokeModel: async () => {
      invoked = true;
      return model();
    }
  });
  assert.equal(invoked, false);
  assert.deepEqual(result, { status: "blocked-input" });
});

test("does not return generated text when Purview blocks the output", async () => {
  const result = await runGovernedTurn({
    prompt: "hello",
    correlationId: "turn-3",
    blockOnError: true,
    policy: policy(false, true),
    telemetry: telemetry(),
    invokeModel: model
  });
  assert.deepEqual(result, { status: "blocked-output" });
});

test("fails closed when Purview is unavailable", async () => {
  const unavailable: PolicyGate = {
    computeProtectionScopes: async () => {
      throw new Error("Purview unavailable");
    },
    evaluate: async () => ({ block: false })
  };
  await assert.rejects(
    runGovernedTurn({
      prompt: "hello",
      correlationId: "turn-4",
      blockOnError: true,
      policy: unavailable,
      telemetry: telemetry(),
      invokeModel: model
    }),
    /Purview unavailable/
  );
});
