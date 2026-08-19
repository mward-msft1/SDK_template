import assert from "node:assert/strict";
import test from "node:test";
import type { AppConfig } from "../src/config.js";
import { parsePurviewDecision, PurviewClient } from "../src/purview-client.js";

test("recognizes nested Purview block actions", () => {
  assert.equal(
    parsePurviewDecision({ policyActions: [{ action: "blockAccess" }] }).block,
    true
  );
});

test("recognizes explicit boolean block decisions", () => {
  assert.equal(parsePurviewDecision({ result: { isBlocked: true } }).block, true);
});

test("does not block audit-only decisions", () => {
  assert.equal(
    parsePurviewDecision({ policyActions: [{ action: "audit" }] }).block,
    false
  );
});

test("sends the protection-scope ETag and documented processContent shape", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [
    new Response(
      JSON.stringify({
        value: [{ activities: "uploadText", executionMode: "evaluateInline" }]
      }),
      { status: 200, headers: { etag: '"scope-1"' } }
    ),
    new Response(
      JSON.stringify({
        protectionScopeState: "notModified",
        policyActions: [
          { action: "restrictAccess", restrictionAction: "block" }
        ],
        processingErrors: []
      }),
      { status: 200 }
    )
  ];
  const fetchFn: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    const response = responses.shift();
    if (!response) throw new Error("Unexpected request");
    return response;
  };
  const config = {
    purviewUserId: "user-id",
    purviewAppLocationId: "app-id",
    purviewGraphBaseUrl: "https://graph.microsoft.com/v1.0",
    graphServiceName: "Graph",
    blueprintAppId: "blueprint-id",
    agentClientId: "agent-id",
    agentName: "Test Agent"
  } as AppConfig;
  const sidecar = {
    getAuthorizationHeader: async (_serviceName: string) => "Bearer test-token"
  };
  const client = new PurviewClient(config, sidecar, fetchFn);

  await client.computeProtectionScopes();
  const decision = await client.evaluate("uploadText", "hello", "correlation-id");

  assert.equal(decision.block, true);
  assert.match(requests[1]?.url ?? "", /dataSecurityAndGovernance\/processContent$/);
  const headers = new Headers(requests[1]?.init?.headers);
  assert.equal(headers.get("If-None-Match"), '"scope-1"');
  const body = JSON.parse(String(requests[1]?.init?.body));
  assert.equal(
    body.contentToProcess.contentEntries[0]["@odata.type"],
    "microsoft.graph.processConversationMetadata"
  );
  assert.equal(body.contentToProcess.contentEntries[0].content.data, "hello");
  assert.equal(body.contentToProcess.activityMetadata.activity, "uploadText");
});

test("enforces blocking actions returned by refreshed protection scopes", async () => {
  const responses = [
    new Response(
      JSON.stringify({
        value: [{ activities: "uploadText", executionMode: "evaluateInline" }]
      }),
      { status: 200, headers: { etag: '"scope-1"' } }
    ),
    new Response(
      JSON.stringify({
        protectionScopeState: "modified",
        policyActions: [],
        processingErrors: []
      }),
      { status: 200 }
    ),
    new Response(
      JSON.stringify({
        value: [
          {
            activities: "uploadText",
            executionMode: "evaluateOffline",
            policyActions: [
              { action: "restrictAccess", restrictionAction: "block" }
            ]
          }
        ]
      }),
      { status: 200, headers: { etag: '"scope-2"' } }
    )
  ];
  const fetchFn: typeof fetch = async () => {
    const response = responses.shift();
    if (!response) throw new Error("Unexpected request");
    return response;
  };
  const config = {
    purviewUserId: "user-id",
    purviewAppLocationId: "app-id",
    purviewGraphBaseUrl: "https://graph.microsoft.com/v1.0",
    graphServiceName: "Graph",
    blueprintAppId: "blueprint-id",
    agentClientId: "agent-id",
    agentName: "Test Agent"
  } as AppConfig;
  const client = new PurviewClient(
    config,
    { getAuthorizationHeader: async () => "Bearer test-token" },
    fetchFn
  );

  await client.computeProtectionScopes();
  const decision = await client.evaluate("uploadText", "hello", "correlation-id");

  assert.equal(decision.block, true);
  assert.equal(responses.length, 0);
});
