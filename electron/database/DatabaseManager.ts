
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import crypto from 'crypto'
import { KeychainManager } from '../utils/KeychainManager'

// Interfaces
export interface Conversation {
    id: string
    title: string
    meeting_type: string
    start_time: number
    end_time: number | null
    participants: string[]
    notes: string
    created_at: number
}

export type Role = 'user' | 'assistant' | 'system'

export interface Message {
    id: string
    conversation_id: string
    role: Role
    content: string
    metadata: any
    timestamp: number
}

type CaptureType = 'screen' | 'audio'

export interface Capture {
    id: string
    conversation_id: string
    type: CaptureType
    data: Buffer | string // Path or Blob
    ocr_text?: string
    transcript?: string
    timestamp: number
}

export interface ConversationFilters {
    limit?: number
    offset?: number
    meeting_type?: string
    startDate?: number
    endDate?: number
}

export interface ExportData {
    conversations: Conversation[]
    messages: Message[]
    captures: Capture[]
    exported_at: number
}

// Encryption Helper
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16

class EncryptionManager {
    private key: Buffer | null = null
    private keychainManager: KeychainManager

    constructor() {
        this.keychainManager = KeychainManager.getInstance()
    }

    private async ensureKey(): Promise<void> {
        if (this.key) return

        // Try to get key from OS keychain first
        let key = await this.keychainManager.getEncryptionKey()
        
        if (!key) {
            // Generate new key and store it
            key = await this.keychainManager.generateAndStoreKey()
        }

        this.key = key
    }

    async encrypt(text: string): Promise<string> {
        await this.ensureKey()
        const iv = crypto.randomBytes(IV_LENGTH)
        const cipher = crypto.createCipheriv(ALGORITHM, this.key!, iv)
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
        const tag = cipher.getAuthTag()
        return Buffer.concat([iv, tag, encrypted]).toString('hex')
    }

    async decrypt(text: string): Promise<string | null> {
        await this.ensureKey()
        try {
            const data = Buffer.from(text, 'hex')
            const iv = data.subarray(0, IV_LENGTH)
            const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
            const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)
            const decipher = crypto.createDecipheriv(ALGORITHM, this.key!, iv)
            decipher.setAuthTag(tag)
            return decipher.update(encrypted) + decipher.final('utf8')
        } catch (e) {
            console.error('Decryption failed:', e)
            return null
        }
    }
}

export class DatabaseManager {
    private db: Database.Database | null = null
    private encryption: EncryptionManager

    constructor() {
        this.encryption = new EncryptionManager()
        // Don't initialize database here - wait until it's needed
    }

    private ensureDatabase(): void {
        if (this.db) return

        const dbPath = path.join(app.getPath('userData'), 'savvy_data.sqlite')
        this.db = new Database(dbPath)
        this.initialize()
    }

    private initialize() {
        // Enable WAL mode for better concurrency
        this.db!.pragma('journal_mode = WAL')

        // Migrations / Schema Creation
        this.db!.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        meeting_type TEXT,
        start_time INTEGER,
        end_time INTEGER,
        participants TEXT,
        notes TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        role TEXT,
        content TEXT,
        metadata TEXT,
        timestamp INTEGER,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS captures (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        type TEXT,
        data TEXT,
        ocr_text TEXT,
        transcript TEXT,
        timestamp INTEGER,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_captures_conv ON captures(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);
    `)

        // Performance optimization
        this.optimize()
    }

    public optimize() {
        this.ensureDatabase()
        try {
            this.db!.exec('PRAGMA optimize;')
            // VACUUM is heavy, usually do it on shutdown or less frequent.
            // Using auto_vacuum or just PRAGMA optimize for now.
        } catch (e) {
            console.error('Database optimization failed:', e)
        }
    }

    // --- Conversations ---

    async createConversation(data: Partial<Conversation>): Promise<Conversation> {
        this.ensureDatabase()
        const id = data.id || uuidv4()
        const now = Date.now()
        const conv: Conversation = {
            id,
            title: data.title || 'New Conversation',
            meeting_type: data.meeting_type || 'GENERAL',
            start_time: data.start_time || now,
            end_time: null,
            participants: data.participants || [],
            notes: data.notes || '',
            created_at: now
        }

        const stmt = this.db!.prepare(`
      INSERT INTO conversations (id, title, meeting_type, start_time, end_time, participants, notes, created_at)
      VALUES (@id, @title, @meeting_type, @start_time, @end_time, @participants, @notes, @created_at)
    `)

        stmt.run({
            ...conv,
            participants: JSON.stringify(conv.participants)
        })

        return conv
    }

    async getConversation(id: string): Promise<Conversation | null> {
        this.ensureDatabase()
        const stmt = this.db!.prepare('SELECT * FROM conversations WHERE id = ?')
        const row = stmt.get(id) as any
        if (!row) return null

        return {
            ...row,
            participants: JSON.parse(row.participants)
        }
    }

    async listConversations(filters: ConversationFilters = {}): Promise<Conversation[]> {
        let query = 'SELECT * FROM conversations WHERE 1=1'
        const params: any[] = []

        if (filters.meeting_type) {
            query += ' AND meeting_type = ?'
            params.push(filters.meeting_type)
        }

        query += ' ORDER BY created_at DESC'

        if (filters.limit) {
            query += ' LIMIT ?'
            params.push(filters.limit)
            if (filters.offset) {
                query += ' OFFSET ?'
                params.push(filters.offset)
            }
        }

        const stmt = this.db.prepare(query)
        const rows = stmt.all(...params) as any[]

        return rows.map(row => ({
            ...row,
            participants: JSON.parse(row.participants)
        }))
    }

    async updateConversation(id: string, data: Partial<Conversation>): Promise<void> {
        const fields: string[] = []
        const params: any = { id }

        for (const [key, value] of Object.entries(data)) {
            if (key === 'id') continue
            fields.push(`${key} = @${key}`)
            params[key] = key === 'participants' ? JSON.stringify(value) : value
        }

        if (fields.length === 0) return

        const stmt = this.db.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = @id`)
        stmt.run(params)
    }

    async deleteConversation(id: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?')
        stmt.run(id)
    }

    // --- Messages ---

    async addMessage(conversationId: string, message: Partial<Message>): Promise<void> {
        const id = message.id || uuidv4()
        const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

        stmt.run(
            id,
            conversationId,
            message.role || 'user',
            message.content || '',
            JSON.stringify(message.metadata || {}),
            message.timestamp || Date.now()
        )
    }

    async getMessages(conversationId: string, limit: number = 100): Promise<Message[]> {
        const stmt = this.db.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp ASC 
      LIMIT ?
    `)
        const rows = stmt.all(conversationId, limit) as any[]

        return rows.map(row => ({
            ...row,
            metadata: JSON.parse(row.metadata)
        }))
    }

    async searchMessages(query: string): Promise<Message[]> {
        const stmt = this.db.prepare(`
      SELECT * FROM messages 
      WHERE content LIKE ? 
      ORDER BY timestamp DESC
      LIMIT 50
    `)
        const rows = stmt.all(`%${query}%`) as any[]
        return rows.map(row => ({
            ...row,
            metadata: JSON.parse(row.metadata)
        }))
    }

    // --- Captures ---

    async saveCapture(conversationId: string, capture: Partial<Capture>): Promise<void> {
        const id = capture.id || uuidv4()
        const stmt = this.db.prepare(`
        INSERT INTO captures (id, conversation_id, type, data, ocr_text, transcript, timestamp)
        VALUES (@id, @conversation_id, @type, @data, @ocr_text, @transcript, @timestamp)
    `)

        stmt.run({
            id,
            conversation_id: conversationId,
            type: capture.type || 'screen',
            data: capture.data, // Storing path or blob
            ocr_text: capture.ocr_text || null,
            transcript: capture.transcript || null,
            timestamp: capture.timestamp || Date.now()
        })
    }

    async getCaptures(conversationId: string, type?: CaptureType): Promise<Capture[]> {
        let query = 'SELECT * FROM captures WHERE conversation_id = ?'
        const params: any[] = [conversationId]

        if (type) {
            query += ' AND type = ?'
            params.push(type)
        }

        query += ' ORDER BY timestamp ASC'

        const stmt = this.db.prepare(query)
        const rows = stmt.all(...params) as any[]
        return rows.map(row => row as Capture)
    }

    // --- Settings ---

    async getSetting(key: string): Promise<string | null> {
        this.ensureDatabase()
        const stmt = this.db!.prepare('SELECT value FROM settings WHERE key = ?')
        const row = stmt.get(key) as any
        if (!row) return null

        // Decrypt if it's a sensitive key
        if (this.isSensitiveKey(key)) {
            return await this.encryption.decrypt(row.value)
        }
        return row.value
    }

    async setSetting(key: string, value: string): Promise<void> {
        this.ensureDatabase()
        let val = value
        if (this.isSensitiveKey(key)) {
            val = await this.encryption.encrypt(value)
        }

        const stmt = this.db!.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `)
        stmt.run(key, val, Date.now())
    }

    async getAllSettings(): Promise<Record<string, string>> {
        this.ensureDatabase()
        const stmt = this.db!.prepare('SELECT key, value FROM settings')
        const rows = stmt.all() as any[]
        const result: Record<string, string> = {}
        for (const row of rows) {
            if (this.isSensitiveKey(row.key)) {
                const decrypted = await this.encryption.decrypt(row.value)
                if (decrypted) result[row.key] = decrypted
            } else {
                result[row.key] = row.value
            }
        }
        return result
    }

    private isSensitiveKey(key: string): boolean {
        return ['openai_api_key', 'anthropic_api_key', 'api_keys'].some(k => key.includes(k))
    }

    // --- Maintenance ---

    async cleanupOldData(retentionDays: number): Promise<void> {
        if (retentionDays <= 0) return
        const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000)

        // Delete old conversations (cascades to messages and captures)
        const stmt = this.db.prepare('DELETE FROM conversations WHERE created_at < ?')
        stmt.run(cutoffDate)
    }

    // --- Import / Export ---

    async exportData(conversationIds?: string[]): Promise<ExportData> {
        // If no IDs provided, export all
        let convQuery = 'SELECT * FROM conversations'
        let params: string[] = []

        if (conversationIds && conversationIds.length > 0) {
            const placeholders = conversationIds.map(() => '?').join(',')
            convQuery += ` WHERE id IN (${placeholders})`
            params = conversationIds
        }

        const convStmt = this.db.prepare(convQuery)
        const convRows = convStmt.all(...params) as any[]
        const conversations = convRows.map(row => ({ ...row, participants: JSON.parse(row.participants) }))

        if (conversations.length === 0) {
            return { conversations: [], messages: [], captures: [], exported_at: Date.now() }
        }

        const ids = conversations.map(c => c.id)
        const idsPlaceholders = ids.map(() => '?').join(',')

        const msgStmt = this.db.prepare(`SELECT * FROM messages WHERE conversation_id IN (${idsPlaceholders})`)
        const msgRows = msgStmt.all(...ids) as any[]
        const messages = msgRows.map(row => ({ ...row, metadata: JSON.parse(row.metadata) }))

        const capStmt = this.db.prepare(`SELECT * FROM captures WHERE conversation_id IN (${idsPlaceholders})`)
        const captures = capStmt.all(...ids) as Capture[]

        return {
            conversations,
            messages,
            captures,
            exported_at: Date.now()
        }
    }

    async importData(data: ExportData): Promise<void> {
        const importTx = this.db.transaction((data: ExportData) => {
            // Import Conversations
            const insertConv = this.db.prepare(`
            INSERT OR REPLACE INTO conversations (id, title, meeting_type, start_time, end_time, participants, notes, created_at)
            VALUES (@id, @title, @meeting_type, @start_time, @end_time, @participants, @notes, @created_at)
        `)
            for (const conv of data.conversations) {
                insertConv.run({ ...conv, participants: JSON.stringify(conv.participants) })
            }

            // Import Messages
            const insertMsg = this.db.prepare(`
            INSERT OR REPLACE INTO messages (id, conversation_id, role, content, metadata, timestamp)
            VALUES (@id, @conversation_id, @role, @content, @metadata, @timestamp)
        `)
            for (const msg of data.messages) {
                insertMsg.run({ ...msg, metadata: JSON.stringify(msg.metadata) })
            }

            // Import Captures
            const insertCap = this.db.prepare(`
            INSERT OR REPLACE INTO captures (id, conversation_id, type, data, ocr_text, transcript, timestamp)
            VALUES (@id, @conversation_id, @type, @data, @ocr_text, @transcript, @timestamp)
        `)
            for (const cap of data.captures) {
                insertCap.run(cap)
            }
        })

        importTx(data)
    }
}
