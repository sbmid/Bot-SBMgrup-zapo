import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'contacts.db')
let db = null

/**
 * Initialize contacts database
 */
export function initContactsDB() {
    db = new Database(dbPath)
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS contacts (
            lid_jid TEXT PRIMARY KEY,
            pn_jid TEXT,
            push_name TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE INDEX IF NOT EXISTS idx_pn_jid ON contacts(pn_jid);
        CREATE INDEX IF NOT EXISTS idx_push_name ON contacts(push_name);
    `)
    
    console.log('Contacts database initialized:', dbPath)
    return db
}

/**
 * Save or update contact (auto mapping LID <-> Phone Number)
 */
export function saveOrUpdateContact({ lidJid, pnJid, pushName }) {
    if (!db) initContactsDB()
    if (!lidJid || !pnJid) return { created: false, updated: false }
    
    const existing = db.prepare('SELECT * FROM contacts WHERE lid_jid = ?').get(lidJid)
    
    if (existing) {
        // Update if push_name changed
        if (pushName && existing.push_name !== pushName) {
            db.prepare(`
                UPDATE contacts 
                SET push_name = ?, pn_jid = ?, updated_at = strftime('%s', 'now')
                WHERE lid_jid = ?
            `).run(pushName, pnJid, lidJid)
            
            return { created: false, updated: true }
        }
        return { created: false, updated: false }
    }
    
    // Insert new contact
    db.prepare(`
        INSERT INTO contacts (lid_jid, pn_jid, push_name)
        VALUES (?, ?, ?)
    `).run(lidJid, pnJid, pushName || null)
    
    return { created: true, updated: false }
}

/**
 * Get contact by any JID (LID or Phone Number)
 */
export function getContactByJid(jid) {
    if (!db) initContactsDB()
    if (!jid) return null
    
    // Try LID first
    let contact = db.prepare('SELECT * FROM contacts WHERE lid_jid = ?').get(jid)
    if (contact) return contact
    
    // Try phone number
    contact = db.prepare('SELECT * FROM contacts WHERE pn_jid = ?').get(jid)
    return contact || null
}

/**
 * Get phone number from LID
 */
export function getPhoneNumberFromLid(lidJid) {
    if (!db) initContactsDB()
    if (!lidJid || !lidJid.includes('@lid')) return null
    
    const contact = db.prepare('SELECT pn_jid FROM contacts WHERE lid_jid = ?').get(lidJid)
    return contact?.pn_jid || null
}

/**
 * Get all contacts
 */
export function getAllContacts() {
    if (!db) initContactsDB()
    return db.prepare('SELECT * FROM contacts ORDER BY updated_at DESC').all()
}

/**
 * Close database connection
 */
export function closeContactsDB() {
    if (db) {
        db.close()
        db = null
    }
}
