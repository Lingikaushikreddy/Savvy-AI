
import { AppState } from '../main'; // Depending on where we need app state, or maybe just pure logic
// Actually, detectPlaybook might need AppState to know the 'active window' or similar if we have that info.
// For now, let's keep it pure and pass the context in.

export type PlaybookType =
    | 'TECHNICAL_INTERVIEW'
    | 'BEHAVIORAL_INTERVIEW'
    | 'SALES_CALL'
    | 'VC_PITCH'
    | 'GENERAL_MEETING';

export interface ResponseFormat {
    includeCode: boolean;
    includeComplexity: boolean;
    useSTARMethod: boolean;
    includeMetrics: boolean;
    tone: 'professional' | 'casual' | 'technical' | 'persuasive' | 'confident';
    maxLength: number;
}

export interface ContextPriority {
    screen: number; // 0-1
    audio: number;
    history: number;
}

export interface Example {
    input: string;
    output: string;
}

export interface Playbook {
    id: PlaybookType;
    name: string;
    description: string;
    detectionPatterns: string[];
    systemPrompt: string; // Base template
    responseFormat: ResponseFormat;
    contextPriority: ContextPriority;
    examples: Example[];
}

export class PlaybookManager {
    private playbooks: Map<string, Playbook> = new Map();

    constructor() {
        this.initializePlaybooks();
    }

    private initializePlaybooks() {
        // 1. Technical Interview
        this.addPlaybook({
            id: 'TECHNICAL_INTERVIEW',
            name: 'Technical Interview Copilot',
            description: 'Assisting in software engineering technical interviews.',
            detectionPatterns: [
                'leetcode', 'hackerrank', 'algorithm', 'big o', 'complexity',
                'system design', 'whiteboard', 'binary tree', 'linked list', 'vs code', 'visual studio code'
            ],
            systemPrompt: `You are Savvy AI, an expert technical interview assistant. The user is currently in a coding interview.
Your goal is to provide complete, optimal, and explained solutions to coding problems.
Rules:
1. Provide a working solution immediately.
2. Include time and space complexity analysis (Big-O).
3. Explain trade-offs between different approaches if applicable.
4. If code is requested, ensure every line effectively commented.
5. Do not be conversational unless asked; focus on the technical content.`,
            responseFormat: {
                includeCode: true,
                includeComplexity: true,
                useSTARMethod: false,
                includeMetrics: false,
                tone: 'technical',
                maxLength: 2000
            },
            contextPriority: { screen: 0.8, audio: 0.1, history: 0.1 },
            examples: []
        });

        // 2. Behavioral Interview
        this.addPlaybook({
            id: 'BEHAVIORAL_INTERVIEW',
            name: 'Behavioral Interview Coach',
            description: 'Assisting in behavioral and leadership principle interviews.',
            detectionPatterns: [
                'tell me about a time', 'weakness', 'strength', 'conflict',
                'challenge', 'leadership', 'star method', 'behavioral'
            ],
            systemPrompt: `You are Savvy AI, an expert behavioral interview coach. The user is in a behavioral interview.
Your goal is to structure responses using the STAR method (Situation, Task, Action, Result).
Rules:
1. Structure every story clearly with STAR headings.
2. Focus on the user's specific actions and impact.
3. Highlight leadership principles and soft skills.
4. Keep the stories concise but impactful.`,
            responseFormat: {
                includeCode: false,
                includeComplexity: false,
                useSTARMethod: true,
                includeMetrics: true,
                tone: 'professional',
                maxLength: 1000
            },
            contextPriority: { screen: 0.2, audio: 0.7, history: 0.1 },
            examples: []
        });

        // 3. Sales Call
        this.addPlaybook({
            id: 'SALES_CALL',
            name: 'Sales Copilot',
            description: 'Assisting in sales calls and objection handling.',
            detectionPatterns: [
                'pricing', 'cost', 'budget', 'competitor', 'expensive',
                'roi', 'value proposition', 'contract', 'deal', 'discount'
            ],
            systemPrompt: `You are Savvy AI, a top-tier sales assistant. The user is on a sales call.
Your goal is to help handle objections and close deals.
Rules:
1. Acknowledge the prospect's concern empathetically.
2. Pivot immediately to value proposition and ROI.
3. Use persuasive, confident language.
4. Always suggest a clear call to action or next step.
5. Provide specific data points or comparisons if relevant.`,
            responseFormat: {
                includeCode: false,
                includeComplexity: false,
                useSTARMethod: false,
                includeMetrics: true,
                tone: 'persuasive',
                maxLength: 800
            },
            contextPriority: { screen: 0.3, audio: 0.6, history: 0.1 },
            examples: []
        });

        // 4. VC Pitch
        this.addPlaybook({
            id: 'VC_PITCH',
            name: 'VC Pitch Assistant',
            description: 'Assisting in investor meetings and fundraising.',
            detectionPatterns: [
                'market size', 'tam', 'sam', 'som', 'traction', 'mrr', 'arr',
                'cac', 'ltv', 'unit economics', 'investor', 'round', 'valuation', 'cap table'
            ],
            systemPrompt: `You are Savvy AI, a strategic advisor for VC meetings. The user is pitching to investors.
Your goal is to provide data-driven, confident answers that highlight growth and potential.
Rules:
1. Focus heavily on metrics: MRR, ARR, CAC, LTV, Growth Rate.
2. Be concise and confident. Avoid hedging words.
3. Address risks directly but pivot to mitigation and opportunity.
4. Frame answers in terms of massive market potential and scalability.`,
            responseFormat: {
                includeCode: false,
                includeComplexity: false,
                useSTARMethod: false,
                includeMetrics: true,
                tone: 'confident',
                maxLength: 1000
            },
            contextPriority: { screen: 0.5, audio: 0.4, history: 0.1 },
            examples: []
        });

        // 5. General Meeting
        this.addPlaybook({
            id: 'GENERAL_MEETING',
            name: 'Meeting Assistant',
            description: 'General assistance for daily meetings.',
            detectionPatterns: [], // Fallback
            systemPrompt: `You are Savvy AI, a helpful, proactive desktop assistant.
You can see what the user sees. Analyze the provided images or context and provide clear, concise, and helpful responses.
If the user presents a problem, solve it. If they present code, debug it or explain it.
Always be friendly and professional.`,
            responseFormat: {
                includeCode: false,
                includeComplexity: false,
                useSTARMethod: false,
                includeMetrics: false,
                tone: 'professional',
                maxLength: 2000
            },
            contextPriority: { screen: 0.5, audio: 0.5, history: 0.0 },
            examples: []
        });
    }

    public detectPlaybook(contextText: string, activeApp?: string): Playbook {
        // Normalize text
        const text = (contextText + ' ' + (activeApp || '')).toLowerCase();

        // specific app checks
        if (activeApp && (activeApp.includes('code') || activeApp.includes('intellij') || activeApp.includes('terminal'))) {
            return this.getPlaybook('TECHNICAL_INTERVIEW');
        }

        // Check patterns
        // We iterate through specific playbooks first
        const specificPlaybooks: PlaybookType[] = ['TECHNICAL_INTERVIEW', 'BEHAVIORAL_INTERVIEW', 'SALES_CALL', 'VC_PITCH'];

        let bestMatch: Playbook | undefined;
        let maxMatches = 0;

        for (const id of specificPlaybooks) {
            const playbook = this.playbooks.get(id);
            if (!playbook) continue;

            let matches = 0;
            for (const pattern of playbook.detectionPatterns) {
                if (text.includes(pattern)) {
                    matches++;
                }
            }

            if (matches > maxMatches) {
                maxMatches = matches;
                bestMatch = playbook;
            }
        }

        if (bestMatch && maxMatches > 0) {
            return bestMatch;
        }

        return this.playbooks.get('GENERAL_MEETING')!;
    }

    public getPlaybook(id: string): Playbook {
        return this.playbooks.get(id) || this.playbooks.get('GENERAL_MEETING')!;
    }

    public addPlaybook(playbook: Playbook) {
        this.playbooks.set(playbook.id, playbook);
    }

    public customizePlaybook(id: string, overrides: Partial<Playbook>): Playbook {
        const existing = this.getPlaybook(id);
        const updated = { ...existing, ...overrides };
        this.playbooks.set(id, updated);
        return updated;
    }

    public getSystemPrompt(playbook: Playbook, context?: any): string {
        // We could inject dynamic context here if needed
        return playbook.systemPrompt;
    }
}
