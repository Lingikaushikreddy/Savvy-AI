
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { Mistral } from '@mistralai/mistralai';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'mistral';

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

interface CacheEntry {
    response: LLMResponse;
    timestamp: number;
}

export class LLMRouter extends EventEmitter {
    private openai: OpenAI | null = null;
    private anthropic: Anthropic | null = null;
    private gemini: GoogleGenAI | null = null;
    private mistral: Mistral | null = null;
    private currentProvider: Provider = 'openai';
    private currentModel: string = 'gpt-4o';

    private cache: Map<string, CacheEntry> = new Map();
    private readonly MAX_CACHE = 200;
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    // Updated models to latest versions for better performance and cost
    private readonly DEFAULTS = {
        openai: {
            model: 'gpt-4o',
            fallback: 'gpt-4o-mini',
            temperature: 0.3,
        },
        anthropic: {
            model: 'claude-sonnet-4-5-20250514',
            fallback: 'claude-haiku-4-5-20251001',
            temperature: 0.3,
        },
        gemini: {
            model: 'gemini-2.0-flash',
            fallback: 'gemini-2.0-flash-lite',
            temperature: 0.3,
        },
        mistral: {
            model: 'mistral-small-latest',
            fallback: 'mistral-small-latest',
            temperature: 0.3,
        },
    };

    constructor() {
        super();

        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
                dangerouslyAllowBrowser: false,
            });
        }

        if (process.env.ANTHROPIC_API_KEY) {
            this.anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });
        }

        if (process.env.GEMINI_API_KEY) {
            this.gemini = new GoogleGenAI({
                apiKey: process.env.GEMINI_API_KEY,
            });
        }

        if (process.env.MISTRAL_API_KEY) {
            this.mistral = new Mistral({
                apiKey: process.env.MISTRAL_API_KEY,
            });
        }

        // Set default provider based on what's available (prefer cheapest first)
        if (this.mistral && !this.openai && !this.anthropic && !this.gemini) {
            this.currentProvider = 'mistral';
            this.currentModel = this.DEFAULTS.mistral.model;
        } else if (this.gemini && !this.openai && !this.anthropic) {
            this.currentProvider = 'gemini';
            this.currentModel = this.DEFAULTS.gemini.model;
        } else if (this.anthropic && !this.openai) {
            this.currentProvider = 'anthropic';
            this.currentModel = this.DEFAULTS.anthropic.model;
        }
    }

    /**
     * Reinitialize a provider with a new API key (called when user updates keys via settings)
     */
    public updateApiKey(provider: Provider, apiKey: string): void {
        if (provider === 'openai') {
            this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: false });
        } else if (provider === 'anthropic') {
            this.anthropic = new Anthropic({ apiKey });
        } else if (provider === 'gemini') {
            this.gemini = new GoogleGenAI({ apiKey });
        } else if (provider === 'mistral') {
            this.mistral = new Mistral({ apiKey });
        }
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
            const raw = JSON.stringify({ m: context.messages, o: options });
            return crypto.createHash('sha256').update(raw).digest('hex');
        } catch {
            return '';
        }
    }

    private getCachedResponse(key: string): LLMResponse | null {
        if (!key) return null;
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
            this.cache.delete(key);
            return null;
        }
        return entry.response;
    }

    private setCachedResponse(key: string, response: LLMResponse): void {
        if (!key) return;
        if (this.cache.size >= this.MAX_CACHE) {
            // Evict oldest entry
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }
        this.cache.set(key, { response, timestamp: Date.now() });
    }

    /**
     * Complete a request (non-streaming)
     */
    public async complete(
        context: Context,
        options?: CompletionOptions
    ): Promise<LLMResponse> {
        const key = this.getCacheKey(context, options);
        const cached = this.getCachedResponse(key);
        if (cached) return cached;

        try {
            let response: LLMResponse;

            if (this.currentProvider === 'mistral') {
                if (!this.mistral) {
                    throw new Error('Mistral client not initialized. Please set MISTRAL_API_KEY.');
                }
                response = await this.completeMistral(context, options);
            } else if (this.currentProvider === 'gemini') {
                if (!this.gemini) {
                    throw new Error('Gemini client not initialized. Please set GEMINI_API_KEY.');
                }
                response = await this.completeGemini(context, options);
            } else if (this.currentProvider === 'openai') {
                if (!this.openai) {
                    throw new Error('OpenAI client not initialized. Please set OPENAI_API_KEY.');
                }
                response = await this.completeOpenAI(context, options);
            } else {
                if (!this.anthropic) {
                    throw new Error('Anthropic client not initialized. Please set ANTHROPIC_API_KEY.');
                }
                response = await this.completeAnthropic(context, options);
            }

            this.setCachedResponse(key, response);
            return response;
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
            if (this.currentProvider === 'mistral') {
                if (!this.mistral) {
                    throw new Error('Mistral client not initialized. Please set MISTRAL_API_KEY.');
                }
                yield* this.streamMistral(context, options);
            } else if (this.currentProvider === 'gemini') {
                if (!this.gemini) {
                    throw new Error('Gemini client not initialized. Please set GEMINI_API_KEY.');
                }
                yield* this.streamGemini(context, options);
            } else if (this.currentProvider === 'openai') {
                if (!this.openai) {
                    throw new Error('OpenAI client not initialized. Please set OPENAI_API_KEY.');
                }
                yield* this.streamOpenAI(context, options);
            } else {
                if (!this.anthropic) {
                    throw new Error('Anthropic client not initialized. Please set ANTHROPIC_API_KEY.');
                }
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

        const response = await this.openai!.chat.completions.create({
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

        const stream = await this.openai!.chat.completions.create({
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

    // --- Shared Anthropic message conversion (extracted from duplicated code) ---

    private convertToAnthropicMessages(context: Context): Array<{ role: 'user' | 'assistant'; content: any }> {
        return context.messages.filter(m => m.role !== 'system').map(m => {
            let content: any = m.content;
            if (Array.isArray(m.content)) {
                content = m.content.map(part => {
                    if (part.type === 'image_url') {
                        const matches = part.image_url.url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,(.+)$/);
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
    }

    // --- Anthropic Implementations ---

    private async completeAnthropic(
        context: Context,
        options?: CompletionOptions
    ): Promise<LLMResponse> {
        const model = options?.model || this.currentModel || this.DEFAULTS.anthropic.model;
        const temperature = options?.temperature ?? this.DEFAULTS.anthropic.temperature;
        const system = context.systemPrompt;
        const messages = this.convertToAnthropicMessages(context);

        const response = await this.anthropic!.messages.create({
            model,
            messages,
            system,
            temperature,
            max_tokens: options?.maxTokens || 4096,
            stop_sequences: options?.stopSequences,
        });

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
        const messages = this.convertToAnthropicMessages(context);

        const stream = await this.anthropic!.messages.create({
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

    // --- Gemini Implementations ---

    private async completeGemini(
        context: Context,
        options?: CompletionOptions
    ): Promise<LLMResponse> {
        const model = options?.model || this.currentModel || this.DEFAULTS.gemini.model;
        const temperature = options?.temperature ?? this.DEFAULTS.gemini.temperature;

        // Build contents for Gemini
        const contents = this.convertToGeminiContents(context);

        const response = await this.gemini!.models.generateContent({
            model,
            contents,
            config: {
                temperature,
                maxOutputTokens: options?.maxTokens || 4096,
                stopSequences: options?.stopSequences,
                systemInstruction: context.systemPrompt,
            },
        });

        const text = response.text || '';

        return {
            text,
            model,
            tokens: {
                prompt: response.usageMetadata?.promptTokenCount || 0,
                completion: response.usageMetadata?.candidatesTokenCount || 0,
                total: response.usageMetadata?.totalTokenCount || 0,
            },
            finishReason: 'stop',
        };
    }

    private async *streamGemini(
        context: Context,
        options?: CompletionOptions
    ): AsyncGenerator<string> {
        const model = options?.model || this.currentModel || this.DEFAULTS.gemini.model;
        const temperature = options?.temperature ?? this.DEFAULTS.gemini.temperature;

        const contents = this.convertToGeminiContents(context);

        const response = await this.gemini!.models.generateContentStream({
            model,
            contents,
            config: {
                temperature,
                maxOutputTokens: options?.maxTokens || 4096,
                stopSequences: options?.stopSequences,
                systemInstruction: context.systemPrompt,
            },
        });

        for await (const chunk of response) {
            const text = chunk.text || '';
            if (text) {
                yield text;
            }
        }
    }

    private convertToGeminiContents(context: Context): Array<{ role: string; parts: any[] }> {
        return context.messages
            .filter(m => m.role !== 'system')
            .map(m => {
                const parts: any[] = [];
                if (typeof m.content === 'string') {
                    parts.push({ text: m.content });
                } else if (Array.isArray(m.content)) {
                    for (const part of m.content) {
                        if (part.type === 'text') {
                            parts.push({ text: part.text });
                        } else if (part.type === 'image_url') {
                            const matches = part.image_url.url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,(.+)$/);
                            if (matches) {
                                parts.push({
                                    inlineData: {
                                        mimeType: matches[1],
                                        data: matches[2]
                                    }
                                });
                            }
                        }
                    }
                }
                return {
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts
                };
            });
    }

    // --- Mistral Implementations ---

    private convertToMistralMessages(context: Context): Array<{ role: 'system' | 'user' | 'assistant'; content: any }> {
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }> = [];
        if (context.systemPrompt) {
            messages.push({ role: 'system', content: context.systemPrompt });
        }
        for (const m of context.messages) {
            if (typeof m.content === 'string') {
                messages.push({ role: m.role, content: m.content });
            } else if (Array.isArray(m.content)) {
                // Mistral supports vision via content array with text/image_url parts (same format as OpenAI)
                const parts = m.content.map(part => {
                    if (part.type === 'image_url') {
                        return { type: 'image_url' as const, imageUrl: part.image_url.url };
                    }
                    return { type: 'text' as const, text: part.text };
                });
                messages.push({ role: m.role, content: parts as any });
            }
        }
        return messages;
    }

    private async completeMistral(
        context: Context,
        options?: CompletionOptions
    ): Promise<LLMResponse> {
        const model = options?.model || this.currentModel || this.DEFAULTS.mistral.model;
        const temperature = options?.temperature ?? this.DEFAULTS.mistral.temperature;
        const messages = this.convertToMistralMessages(context);

        const response = await this.mistral!.chat.complete({
            model,
            messages: messages as any,
            temperature,
            maxTokens: options?.maxTokens,
            stop: options?.stopSequences,
        });

        const choice = response.choices?.[0];

        return {
            text: (choice?.message?.content as string) || '',
            model: response.model || model,
            tokens: {
                prompt: response.usage?.promptTokens || 0,
                completion: response.usage?.completionTokens || 0,
                total: response.usage?.totalTokens || 0,
            },
            finishReason: choice?.finishReason || 'stop',
        };
    }

    private async *streamMistral(
        context: Context,
        options?: CompletionOptions
    ): AsyncGenerator<string> {
        const model = options?.model || this.currentModel || this.DEFAULTS.mistral.model;
        const temperature = options?.temperature ?? this.DEFAULTS.mistral.temperature;
        const messages = this.convertToMistralMessages(context);

        const stream = await this.mistral!.chat.stream({
            model,
            messages: messages as any,
            temperature,
            maxTokens: options?.maxTokens,
            stop: options?.stopSequences,
        });

        for await (const event of stream) {
            const content = event.data?.choices?.[0]?.delta?.content;
            if (content && typeof content === 'string') {
                yield content;
            }
        }
    }

    public estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    public clearCache(): void {
        this.cache.clear();
    }
}
