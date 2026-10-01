import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../../data/confess.db')

const db = new Database(dbPath)

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS confess_sessions (
        confess_id TEXT PRIMARY KEY,
        sender_jid TEXT NOT NULL,
        receiver_jid TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        status TEXT DEFAULT 'active',
        sender_msg_count INTEGER DEFAULT 0,
        receiver_msg_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS confess_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        confess_id TEXT NOT NULL,
        from_role TEXT NOT NULL,
        message_text TEXT,
        media_type TEXT,
        sent_at INTEGER NOT NULL,
        FOREIGN KEY (confess_id) REFERENCES confess_sessions(confess_id)
    );

    CREATE TABLE IF NOT EXISTS confess_blocked (
        user_jid TEXT PRIMARY KEY,
        blocked_at INTEGER NOT NULL,
        blocked_by TEXT,
        reason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_sender ON confess_sessions(sender_jid, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_receiver ON confess_sessions(receiver_jid, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON confess_sessions(status);
`)

console.log('Confess database initialized:', dbPath)

// Get active session for user (as sender or receiver)
export function getActiveSession(userJid) {
    const stmt = db.prepare(`
        SELECT * FROM confess_sessions 
        WHERE (sender_jid = ? OR receiver_jid = ?) 
        AND status = 'active'
        LIMIT 1
    `)
    return stmt.get(userJid, userJid)
}

// Get session role (sender/receiver)
export function getSessionRole(userJid, confessId) {
    const stmt = db.prepare('SELECT sender_jid, receiver_jid FROM confess_sessions WHERE confess_id = ?')
    const session = stmt.get(confessId)
    if (!session) return null
    if (session.sender_jid === userJid) return 'sender'
    if (session.receiver_jid === userJid) return 'receiver'
    return null
}

// Create new session
export function createSession(confessId, senderJid, receiverJid) {
    const stmt = db.prepare(`
        INSERT INTO confess_sessions (confess_id, sender_jid, receiver_jid, started_at)
        VALUES (?, ?, ?, ?)
    `)
    const now = Math.floor(Date.now() / 1000)
    stmt.run(confessId, senderJid, receiverJid, now)
}

// End session
export function endSession(confessId) {
    const stmt = db.prepare(`
        UPDATE confess_sessions 
        SET status = 'ended', ended_at = ?
        WHERE confess_id = ?
    `)
    const now = Math.floor(Date.now() / 1000)
    stmt.run(now, confessId)
}

// Increment message count
export function incrementMessageCount(confessId, role) {
    const field = role === 'sender' ? 'sender_msg_count' : 'receiver_msg_count'
    const stmt = db.prepare(`
        UPDATE confess_sessions 
        SET ${field} = ${field} + 1
        WHERE confess_id = ?
    `)
    stmt.run(confessId)
}

// Log message
export function logMessage(confessId, fromRole, messageText, mediaType) {
    const stmt = db.prepare(`
        INSERT INTO confess_messages (confess_id, from_role, message_text, media_type, sent_at)
        VALUES (?, ?, ?, ?, ?)
    `)
    const now = Math.floor(Date.now() / 1000)
    stmt.run(confessId, fromRole, messageText, mediaType, now)
}

// Check if user is blocked
export function isBlocked(userJid) {
    const stmt = db.prepare('SELECT 1 FROM confess_blocked WHERE user_jid = ?')
    return !!stmt.get(userJid)
}

// Block user
export function blockUser(userJid, blockedBy, reason = null) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO confess_blocked (user_jid, blocked_at, blocked_by, reason)
        VALUES (?, ?, ?, ?)
    `)
    const now = Math.floor(Date.now() / 1000)
    stmt.run(userJid, now, blockedBy, reason)
}

// Unblock user
export function unblockUser(userJid) {
    const stmt = db.prepare('DELETE FROM confess_blocked WHERE user_jid = ?')
    stmt.run(userJid)
}

// Get session by ID
export function getSessionById(confessId) {
    const stmt = db.prepare('SELECT * FROM confess_sessions WHERE confess_id = ?')
    return stmt.get(confessId)
}

// Get user stats
export function getUserStats(userJid) {
    const stmtSent = db.prepare('SELECT COUNT(*) as count FROM confess_sessions WHERE sender_jid = ?')
    const stmtReceived = db.prepare('SELECT COUNT(*) as count FROM confess_sessions WHERE receiver_jid = ?')
    
    return {
        sent: stmtSent.get(userJid).count,
        received: stmtReceived.get(userJid).count
    }
}

export default db
