export interface LlmClient {
  generateText(input: { prompt: string; system?: string; temperature?: number }): Promise<{ text: string }>;
}


