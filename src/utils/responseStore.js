import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = './data'
const DB_PATH = path.join(DB_DIR, 'responses.db')

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
}

// Initialize database
const db = new Database(DB_PATH)

// Create table if not exists
db.exec(`
    CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_jid TEXT NOT NULL,
        key TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        UNIQUE(group_jid, key)
    )
`)

// Create index for faster lookups
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_group_key ON responses(group_jid, key)
`)

console.log('Response database initialized:', DB_PATH)

// Add response
export function addResponse(groupJid, key, text) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO responses (group_jid, key, text, created_at, updated_at, count)
        VALUES (?, ?, ?, 
            COALESCE((SELECT created_at FROM responses WHERE group_jid = ? AND key = ?), ?),
            ?,
            COALESCE((SELECT count FROM responses WHERE group_jid = ? AND key = ?), 0)
        )
    `)
    
    const now = new Date().toISOString()
    stmt.run(groupJid, key.toLowerCase(), text, groupJid, key.toLowerCase(), now, now, groupJid, key.toLowerCase())
    return true
}

// Delete response
export function deleteResponse(groupJid, key) {
    const stmt = db.prepare('DELETE FROM responses WHERE group_jid = ? AND key = ?')
    const result = stmt.run(groupJid, key.toLowerCase())
    return result.changes > 0
}

// Get response and increment counter
export function getResponse(groupJid, key) {
    const stmt = db.prepare('SELECT text FROM responses WHERE group_jid = ? AND key = ?')
    const row = stmt.get(groupJid, key.toLowerCase())
    
    if (!row) return null
    
    // Increment counter
    const updateStmt = db.prepare('UPDATE responses SET count = count + 1 WHERE group_jid = ? AND key = ?')
    updateStmt.run(groupJid, key.toLowerCase())
    
    return row.text
}

// List all responses for a group
export function listResponses(groupJid) {
    const stmt = db.prepare('SELECT key, text, count, created_at FROM responses WHERE group_jid = ? ORDER BY key ASC')
    return stmt.all(groupJid).map(row => ({
        key: row.key,
        text: row.text,
        count: row.count,
        createdAt: row.created_at
    }))
}

// Get statistics
export function getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as total FROM responses')
    const groupsStmt = db.prepare('SELECT COUNT(DISTINCT group_jid) as groups FROM responses')
    const topStmt = db.prepare('SELECT key, text, count FROM responses ORDER BY count DESC LIMIT 10')
    
    return {
        totalResponses: totalStmt.get().total,
        totalGroups: groupsStmt.get().groups,
        topUsed: topStmt.all()
    }
}

// Close database on exit
process.on('exit', () => db.close())
process.on('SIGINT', () => {
    db.close()
    process.exit(0)
})
