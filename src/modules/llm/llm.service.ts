import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly client: OpenAI | null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not found in environment variables. LLM functionality will be limited.',
      );
      this.client = null;
    } else {
      this.client = new OpenAI({ apiKey });
    }
  }

  /**
   * Completes a prompt using OpenAI's chat completion API.
   * @param prompt The prompt to complete
   * @returns The completion text, or empty string if client is not available
   */
  async complete(prompt: string): Promise<string> {
    if (!this.client) {
      this.logger.warn('OpenAI client not initialized. Returning empty string.');
      return '';
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });

      return completion.choices[0]?.message?.content ?? '';
    } catch (error) {
      this.logger.error('Error calling OpenAI API', error);
      throw error;
    }
  }

  // TODO: Add methods for MAS-specific use cases:
  // - explainSchedule(schedule: Schedule): Promise<string> - Generate natural language explanation of roster
  // - prioritizeConflicts(conflicts: ScheduleIssue[]): Promise<ScheduleIssue[]> - Use LLM to prioritize which conflicts to resolve first
  // - suggestOptimizations(schedule: ScheduleWithIssues): Promise<string[]> - Suggest improvements based on soft constraints
}

