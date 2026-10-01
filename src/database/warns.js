import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '../../data/warns.db')
const db = new Database(dbPath)

// Initialize table
db.exec(`
    CREATE TABLE IF NOT EXISTS warns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_jid TEXT NOT NULL,
        user_jid TEXT NOT NULL,
        reason TEXT,
        warned_by TEXT,
        warned_at INTEGER DEFAULT (strftime('%s', 'now')),
        UNIQUE(group_jid, user_jid, id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_group_user ON warns(group_jid, user_jid);
`)

console.log('Warns database initialized:', dbPath)

// Add warn
export function addWarn(groupJid, userJid, reason, warnedBy) {
    const stmt = db.prepare(`
        INSERT INTO warns (group_jid, user_jid, reason, warned_by)
        VALUES (?, ?, ?, ?)
    `)
    const result = stmt.run(groupJid, userJid, reason || null, warnedBy)
    return result.lastInsertRowid
}

// Get warn count for user in group
export function getWarnCount(groupJid, userJid) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM warns WHERE group_jid = ? AND user_jid = ?')
    const result = stmt.get(groupJid, userJid)
    return result?.count || 0
}

// Get all warns for user in group
export function getWarns(groupJid, userJid) {
    const stmt = db.prepare('SELECT * FROM warns WHERE group_jid = ? AND user_jid = ? ORDER BY warned_at DESC')
    return stmt.all(groupJid, userJid)
}

// Clear warns for user in group
export function clearWarns(groupJid, userJid) {
    const stmt = db.prepare('DELETE FROM warns WHERE group_jid = ? AND user_jid = ?')
    const result = stmt.run(groupJid, userJid)
    return result.changes
}

export default {
    addWarn,
    getWarnCount,
    getWarns,
    clearWarns
}
