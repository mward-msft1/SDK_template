import {
  BedrockRuntimeClient,
  ConverseCommand
} from "@aws-sdk/client-bedrock-runtime";

function responseText(response) {
  const content = response.output?.message?.content || [];
  const text = content
    .map((block) => block.text)
    .filter(Boolean)
    .join("\n");

  if (!text) {
    throw new Error("Amazon Bedrock returned no text content.");
  }

  return text;
}

export class BedrockAdapter {
  constructor(config, client) {
    this.config = config;
    this.client =
      client ||
      new BedrockRuntimeClient({
        region: config.awsRegion
      });
  }

  async invoke(context) {
    const response = await this.client.send(
      new ConverseCommand({
        modelId: this.config.bedrockModelId,
        system: [{ text: this.config.bedrockSystemPrompt }],
        messages: [
          {
            role: "user",
            content: [{ text: context.inputText }]
          }
        ],
        inferenceConfig: {
          maxTokens: this.config.bedrockMaxTokens,
          temperature: this.config.bedrockTemperature
        },
        requestMetadata: {
          turnId: context.turnId
        }
      })
    );

    return {
      outputText: responseText(response),
      modelId: this.config.bedrockModelId,
      stopReason: response.stopReason,
      usage: response.usage
    };
  }
}
