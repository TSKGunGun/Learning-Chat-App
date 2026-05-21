export interface ChatCompletionService {
  generateReply(input: string): Promise<string>;
}
