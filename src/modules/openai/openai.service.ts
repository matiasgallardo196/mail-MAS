import { Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../../config/env.loader';

@Injectable()
export class OpenAIService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OpenAIService.name);
    private client: OpenAI;

    onModuleInit() {
        this.logger.log('Initializing OpenAIService...');

        if (!OPENAI_API_KEY) {
            this.logger.error('OPENAI_API_KEY is missing. OpenAI Service cannot be initialized.');
            // Depending on strictness, we might want to throw. 
            // Given the fallback nature of the orchestrator, we might log warning.
            // But for a dedicated service, usually we expect config to be present.
            // Let's throw to ensure visibility of configuration error.
            throw new Error('OPENAI_API_KEY is not defined in environment variables.');
        }

        try {
            this.client = new OpenAI({
                apiKey: OPENAI_API_KEY,
            });
            this.logger.log('OpenAI Service initialized successfully.');
        } catch (error) {
            this.logger.error('Failed to initialize OpenAI client', error);
            throw error;
        }
    }

    onModuleDestroy() {
        this.logger.log('Destroying OpenAIService...');
        // OpenAI client doesn't need explicit disconnect, but good lifecycle hook
    }

    get openai(): OpenAI {
        return this.client;
    }
}
