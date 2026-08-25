import assert from "node:assert/strict";
import test from "node:test";
import { createEnvironment } from "../scripts/import-blueprint.mjs";

test("maps generated blueprint identifiers without copying a secret", () => {
  const env = createEnvironment({
    tenantId: "11111111-1111-4111-8111-111111111111",
    agentBlueprintId: "22222222-2222-4222-8222-222222222222",
    agentBlueprintClientSecret: "must-not-be-copied"
  });

  assert.match(env, /TENANT_ID=11111111-1111-4111-8111-111111111111/);
  assert.match(env, /AGENT_BLUEPRINT_ID=22222222-2222-4222-8222-222222222222/);
  assert.doesNotMatch(env, /must-not-be-copied/);
  assert.match(env, /PASTE_FOR_LOCAL_DEVELOPMENT_ONLY/);
});

test("rejects a generated config without valid identifiers", () => {
  assert.throws(
    () => createEnvironment({ tenantId: "bad", agentBlueprintId: "bad" }),
    /tenantId/
  );
});
