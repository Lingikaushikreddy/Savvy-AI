
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';

export type Provider = 'openai' | 'anthropic';

export interface TextPart {
    type: 'text';
    text: string;
}

export interface ImagePart {
    type: 'image_url';
    image_url: {
        url: string; // base64 data:image/... or http url
        detail?: 'auto' | 'low' | 'high';
    };
}

export type MessageContent = string | Array<TextPart | ImagePart>;

// Basic context interface for what we send to the LLM
export interface Context {
    systemPrompt?: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: MessageContent;
    }>;
}

export interface CompletionOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
}

export interface TokenUsage {
    prompt: number;
    completion: number;
    total: number;
}

export interface LLMResponse {
    text: string;
    model: string;
    tokens?: TokenUsage;
    finishReason?: string;
}

export class LLMRouter extends EventEmitter {
    private openai: OpenAI;
    private anthropic: Anthropic;
    private currentProvider: Provider = 'openai';
    private currentModel: string = 'gpt-4o'; // Default to vision capable model

    private cache: Map<string, LLMResponse> = new Map();
    private readonly MAX_CACHE = 50;

    // Default models for each provider
    private readonly DEFAULTS = {
        openai: {
            model: 'gpt-4o',
            fallback: 'gpt-4o-mini',
            temperature: 0.3,
        },
        anthropic: {
            model: 'claude-3-sonnet-20240229',
            fallback: 'claude-3-haiku-20240307',
            temperature: 0.3,
        },
    };

    constructor() {
        super();
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            dangerouslyAllowBrowser: false,
        });

        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    public setProvider(provider: Provider) {
        this.currentProvider = provider;
        this.currentModel = this.DEFAULTS[provider].model;
    }

    public setModel(model: string) {
        this.currentModel = model;
    }

    private getCacheKey(context: Context, options?: CompletionOptions): string {
        try {
            // Simple signature based on message content
            // We ignore system prompt if not present, and options for simplicity unless crucial
            return JSON.stringify({ m: context.messages, o: options })
        } catch {
            return ''
        }
    }

    /**
     * Complete a request (non-streaming)
     */
    public async complete(
        context: Context,
        options?: CompletionOptions
    ): Promise<LLMResponse> {
        const key = this.getCacheKey(context, options)
        if (key && this.cache.has(key)) {
            console.log('LLMRouter: Cache Hit')
            return this.cache.get(key)!
        }

        try {
            let response: LLMResponse
            if (this.currentProvider === 'openai') {
                response = await this.completeOpenAI(context, options);
            } else {
                response = await this.completeAnthropic(context, options);
            }

            if (key) {
                if (this.cache.size >= this.MAX_CACHE) {
                    const first = this.cache.keys().next().value
                    this.cache.delete(first)
                }
                this.cache.set(key, response)
            }
            return response
        } catch (error) {
            console.error('Error in LLMRouter.complete:', error);
            throw error;
        }
    }

    /**
     * Stream a request
     */
    public async *stream(
        context: Context,
        options?: CompletionOptions
    ): AsyncGenerator<string> {
        try {
            if (this.currentProvider === 'openai') {
                yield* this.streamOpenAI(context, options);
            } else {
                yield* this.streamAnthropic(context, options);
            }
        } catch (error) {
            console.error('Error in LLMRouter.stream:', error);
            throw error;
        }
    }

    // --- OpenAI Implementations ---

    private async completeOpenAI(
        context: Context,
        options?: CompletionOptions
    ): Promise<LLMResponse> {
        const model = options?.model || this.currentModel || this.DEFAULTS.openai.model;
        const temperature = options?.temperature ?? this.DEFAULTS.openai.temperature;

        const messages = [...context.messages];
        if (context.systemPrompt) {
            messages.unshift({ role: 'system', content: context.systemPrompt });
        }

        const response = await this.openai.chat.completions.create({
            model,
            messages: messages as any,
            temperature,
            max_tokens: options?.maxTokens,
            stop: options?.stopSequences,
        });

        const choice = response.choices[0];

        return {
            text: choice.message.content || '',
            model: response.model,
            tokens: {
                prompt: response.usage?.prompt_tokens || 0,
                completion: response.usage?.completion_tokens || 0,
                total: response.usage?.total_tokens || 0,
            },
            finishReason: choice.finish_reason,
        };
    }

    private async *streamOpenAI(
        context: Context,
        options?: CompletionOptions
    ): AsyncGenerator<string> {
        const model = options?.model || this.currentModel || this.DEFAULTS.openai.model;
        const temperature = options?.temperature ?? this.DEFAULTS.openai.temperature;

        const messages = [...context.messages];
        if (context.systemPrompt) {
            messages.unshift({ role: 'system', content: context.systemPrompt });
        }

        const stream = await this.openai.chat.completions.create({
            model,
            messages: messages as any,
            temperature,
            max_tokens: options?.maxTokens,
            stop: options?.stopSequences,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                yield content;
            }
        }
    }

    // --- Anthropic Implementations ---

    private async completeAnthropic(
        context: Context,
        options?: CompletionOptions
    ): Promise<LLMResponse> {
        const model = options?.model || this.currentModel || this.DEFAULTS.anthropic.model;
        const temperature = options?.temperature ?? this.DEFAULTS.anthropic.temperature;

        const system = context.systemPrompt;

        // Convert generic content to Anthropic format if needed
        // Anthropic Image block: { type: "image", source: { type: "base64", media_type: ..., data: ... } }
        // We need to map our ImagePart to Anthropic's format.
        const messages = context.messages.filter(m => m.role !== 'system').map(m => {
            let content: any = m.content;
            if (Array.isArray(m.content)) {
                content = m.content.map(part => {
                    if (part.type === 'image_url') {
                        // Extract base64 and mime from data url: "data:image/png;base64,..."
                        const matches = part.image_url.url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
                        if (matches) {
                            return {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: matches[1],
                                    data: matches[2]
                                }
                            };
                        }
                        // Anthropic doesn't support http urls directly usually, mostly base64. 
                        // Fallback or error if not base64? For now assume base64 is passed.
                        return { type: 'text', text: '[Image URL not supported in Anthropic directly]' };
                    }
                    return part;
                });
            }
            return {
                role: m.role as 'user' | 'assistant',
                content
            };
        });

        const response = await this.anthropic.messages.create({
            model,
            messages,
            system,
            temperature,
            max_tokens: options?.maxTokens || 4096, // Anthropic requires max_tokens usually
            stop_sequences: options?.stopSequences,
        });

        // Content is an array of blocks, we want the text one.
        const textBlock = response.content.find(c => c.type === 'text');
        const text = textBlock?.type === 'text' ? textBlock.text : '';

        return {
            text,
            model: response.model,
            tokens: {
                prompt: response.usage.input_tokens,
                completion: response.usage.output_tokens,
                total: response.usage.input_tokens + response.usage.output_tokens,
            },
            finishReason: response.stop_reason || 'unknown',
        };
    }

    private async *streamAnthropic(
        context: Context,
        options?: CompletionOptions
    ): AsyncGenerator<string> {
        const model = options?.model || this.currentModel || this.DEFAULTS.anthropic.model;
        const temperature = options?.temperature ?? this.DEFAULTS.anthropic.temperature;

        const system = context.systemPrompt;

        const messages = context.messages.filter(m => m.role !== 'system').map(m => {
            let content: any = m.content;
            if (Array.isArray(m.content)) {
                content = m.content.map(part => {
                    if (part.type === 'image_url') {
                        const matches = part.image_url.url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
                        if (matches) {
                            return {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: matches[1],
                                    data: matches[2]
                                }
                            };
                        }
                        return { type: 'text', text: '[Image URL not supported]' };
                    }
                    return part;
                });
            }
            return {
                role: m.role as 'user' | 'assistant',
                content
            };
        });

        const stream = await this.anthropic.messages.create({
            model,
            messages,
            system,
            temperature,
            max_tokens: options?.maxTokens || 4096,
            stop_sequences: options?.stopSequences,
            stream: true,
        });

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield event.delta.text;
            }
        }
    }

    public estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

}
