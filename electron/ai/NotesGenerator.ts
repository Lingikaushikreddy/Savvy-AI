import { AppState } from '../main'
import { MeetingNotes, Decision, ActionItem, Email } from '../../src/shared/ipc-types'
import { Context } from './LLMRouter'

export class NotesGenerator {
    private appState: AppState

    constructor(appState: AppState) {
        this.appState = appState
    }

    public async generateNotes(conversationId: string): Promise<MeetingNotes> {
        const messages = await this.appState.databaseManager.getMessages(conversationId, 1000)
        if (!messages || messages.length === 0) {
            throw new Error('No messages found for this conversation')
        }

        const history = messages.map(m => `${m.role}: ${m.content}`).join('\n')

        const prompt = `Analyze this meeting conversation and generate comprehensive notes:
   
${history}

Extract:
1. Summary (2-3 sentences)
2. Key discussion points
3. Decisions made with rationale
4. Action items with owners
5. Unanswered questions
6. Next steps

Format as structured JSON matching this interface:
{
  "title": "Meeting Title",
  "summary": "...",
  "keyPoints": ["..."],
  "decisions": [{"topic": "...", "decision": "...", "rationale": "...", "decidedBy": "..."}],
  "actionItems": [{"task": "...", "assignee": "...", "dueDate": "YYYY-MM-DD", "priority": "high|medium|low", "status": "pending"}],
  "nextSteps": ["..."],
  "questions": ["..."]
}
Ensure the output is valid JSON only (no markdown code blocks).`

        try {
            const context: Context = {
                messages: [{ role: 'user', content: prompt }]
            }

            const response = await this.appState.processingHelper.llmHelper.llmRouter.complete(context, {
                model: 'gpt-4o' // Prefer high intelligence model
            })

            const jsonStr = this.extractJSON(response.text)
            const parsed = JSON.parse(jsonStr)

            // Fill in missing fields with defaults
            const notes: MeetingNotes = {
                title: parsed.title || 'Untitled Meeting',
                date: new Date().toISOString(),
                duration: 0, // Calculate if timestamps available
                participants: [], // Extract from history or DB
                summary: parsed.summary || '',
                keyPoints: parsed.keyPoints || [],
                decisions: parsed.decisions || [],
                actionItems: parsed.actionItems || [],
                nextSteps: parsed.nextSteps || [],
                questions: parsed.questions || []
            }

            // Calculate derived data
            if (messages.length > 0) {
                const start = messages[0].timestamp
                const end = messages[messages.length - 1].timestamp
                notes.duration = (end - start) / 1000 / 60 // minutes
                notes.date = new Date(start).toISOString()
            }

            return notes
        } catch (error) {
            console.error('Error generating notes:', error)
            throw new Error('Failed to generate notes')
        }
    }

    public async generateFollowUpEmail(conversationId: string, recipient?: string): Promise<Email> {
        const notes = await this.generateNotes(conversationId)

        const prompt = `Generate a professional follow-up email based on these meeting notes:
        
${JSON.stringify(notes, null, 2)}

Format as JSON:
{
  "subject": "...",
  "body": "..."
}`
        const context: Context = {
            messages: [{ role: 'user', content: prompt }]
        }

        const response = await this.appState.processingHelper.llmHelper.llmRouter.complete(context)
        const json = JSON.parse(this.extractJSON(response.text))

        return {
            subject: json.subject,
            body: json.body,
            recipient,
            attachments: ['notes.pdf', 'summary.md'] // Placeholders
        }
    }

    public async extractActionItems(conversationId: string): Promise<ActionItem[]> {
        const notes = await this.generateNotes(conversationId)
        return notes.actionItems
    }

    public async summarizeConversation(conversationId: string, maxLength: number = 200): Promise<string> {
        const notes = await this.generateNotes(conversationId)
        return notes.summary.substring(0, maxLength)
    }

    private extractJSON(text: string): string {
        const match = text.match(/```json\n([\s\S]*?)\n```/)
        if (match) return match[1]
        const match2 = text.match(/```\n([\s\S]*?)\n```/)
        if (match2) return match2[1]
        // If no code block, try to find first { and last }
        const start = text.indexOf('{')
        const end = text.lastIndexOf('}')
        if (start !== -1 && end !== -1) return text.substring(start, end + 1)
        return text
    }
}
