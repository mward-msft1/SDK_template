import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredGuid(config, name) {
  const value = typeof config[name] === "string" ? config[name].trim() : "";
  if (!GUID.test(value)) {
    throw new Error(`${name} is missing or is not a GUID.`);
  }
  return value;
}

export function createEnvironment(config) {
  const tenantId = requiredGuid(config, "tenantId");
  const blueprintId = requiredGuid(config, "agentBlueprintId");

  return [
    `TENANT_ID=${tenantId}`,
    `AGENT_BLUEPRINT_ID=${blueprintId}`,
    "AGENT_BLUEPRINT_CLIENT_SECRET=<PASTE_FOR_LOCAL_DEVELOPMENT_ONLY>",
    `AGENT_CLIENT_ID=${blueprintId}`,
    "AGENT_NAME=<YOUR_AGENT_NAME>",
    "AGENT_DESCRIPTION=<YOUR_AGENT_DESCRIPTION>",
    "AGENT_PROVIDER_NAME=<YOUR_AGENT_HOST_OR_FRAMEWORK>",
    "AGENT_MODEL=<YOUR_MODEL_NAME>",
    "",
    "USE_AGENTIC_AUTH=true",
    `connections__service_connection__settings__clientId=${blueprintId}`,
    "connections__service_connection__settings__clientSecret=<PASTE_FOR_LOCAL_DEVELOPMENT_ONLY>",
    `connections__service_connection__settings__tenantId=${tenantId}`,
    "",
    "A365_EXPORT_ENABLED=false",
    "A365_CONSOLE_EXPORT_ENABLED=true",
    "A365_RECORD_CONTENT=false",
    "ENTRA_SIDECAR_URL=http://localhost:5000",
    "ENTRA_AGENT365_SERVICE_NAME=Agent365",
    ""
  ].join("\n");
}

export function importBlueprint(sourcePath, targetPath) {
  const source = resolve(sourcePath);
  const target = resolve(targetPath);
  if (!existsSync(source)) {
    throw new Error(`Generated config not found: ${source}`);
  }
  if (existsSync(target)) {
    throw new Error(`Refusing to overwrite existing file: ${target}`);
  }

  const config = JSON.parse(readFileSync(source, "utf8"));
  writeFileSync(target, createEnvironment(config), {
    encoding: "utf8",
    flag: "wx"
  });
  return target;
}

function main() {
  const source = process.argv[2] ?? "a365.generated.config.json";
  const target = process.argv[3] ?? ".env";
  const output = importBlueprint(source, target);
  console.log(`Created ${output} with blueprint IDs.`);
  console.log(
    "The client secret was not copied. Run the documented a365 --show-secret command and paste it into .env for local development only."
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
