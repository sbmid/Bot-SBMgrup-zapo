import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '../../data/groupSettings.db')
const db = new Database(dbPath)

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS group_settings (
        group_jid TEXT PRIMARY KEY,
        antilink BOOLEAN DEFAULT 0,
        welcome BOOLEAN DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
`)

// Get group settings
export function getGroupSettings(groupJid) {
    const stmt = db.prepare('SELECT * FROM group_settings WHERE group_jid = ?')
    let settings = stmt.get(groupJid)
    
    if (!settings) {
        // Create default settings
        const insert = db.prepare('INSERT INTO group_settings (group_jid) VALUES (?)')
        insert.run(groupJid)
        settings = { group_jid: groupJid, antilink: 0, welcome: 0 }
    }
    
    return settings
}

// Set antilink
export function setAntilink(groupJid, enabled) {
    const stmt = db.prepare(`
        INSERT INTO group_settings (group_jid, antilink) 
        VALUES (?, ?)
        ON CONFLICT(group_jid) DO UPDATE SET antilink = excluded.antilink
    `)
    stmt.run(groupJid, enabled ? 1 : 0)
}

// Set welcome
export function setWelcome(groupJid, enabled) {
    const stmt = db.prepare(`
        INSERT INTO group_settings (group_jid, welcome) 
        VALUES (?, ?)
        ON CONFLICT(group_jid) DO UPDATE SET welcome = excluded.welcome
    `)
    stmt.run(groupJid, enabled ? 1 : 0)
}

export default {
    getGroupSettings,
    setAntilink,
    setWelcome
}
