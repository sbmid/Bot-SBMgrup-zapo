import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../../data/purestatus.db')

let db = null

export function initPureStatusDB() {
    try {
        db = new Database(dbPath)
        
        // Create uploads table
        db.exec(`
            CREATE TABLE IF NOT EXISTS uploads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT UNIQUE NOT NULL,
                url TEXT NOT NULL,
                original_name TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                resolution TEXT,
                duration INTEGER,
                uploader_phone TEXT,
                uploader_name TEXT,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                downloaded INTEGER DEFAULT 0,
                downloaded_at INTEGER,
                downloaded_by TEXT
            )
        `)
        
        // Create global stats table
        db.exec(`
            CREATE TABLE IF NOT EXISTS global_stats (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                total_uploads INTEGER DEFAULT 0,
                total_downloads INTEGER DEFAULT 0,
                accumulated_size INTEGER DEFAULT 0,
                last_updated INTEGER
            )
        `)
        
        // Initialize stats if not exists
        db.exec(`
            INSERT OR IGNORE INTO global_stats (id, total_uploads, total_downloads, accumulated_size, last_updated)
            VALUES (1, 0, 0, 0, ${Date.now()})
        `)
        
        // Create indexes
        db.exec(`CREATE INDEX IF NOT EXISTS idx_token ON uploads(token)`)
        db.exec(`CREATE INDEX IF NOT EXISTS idx_expires ON uploads(expires_at)`)
        
        console.log('[PureStatus DB] Initialized')
        return db
    } catch (error) {
        console.error('[PureStatus DB] Init error:', error)
        throw error
    }
}

// Generate unique token
export function generateToken() {
    return crypto.randomBytes(4).toString('hex').toUpperCase() // 8 char token
}

// Create upload entry
export function createUpload(data) {
    if (!db) initPureStatusDB()
    
    const token = generateToken()
    const now = Date.now()
    const expiresAt = now + (60 * 60 * 1000) // 1 hour
    
    const stmt = db.prepare(`
        INSERT INTO uploads (
            token, url, original_name, file_type, file_size,
            resolution, duration, uploader_phone, uploader_name,
            created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
        token,
        data.url,
        data.originalName,
        data.fileType,
        data.fileSize,
        data.resolution || null,
        data.duration || null,
        data.uploaderPhone || null,
        data.uploaderName || null,
        now,
        expiresAt
    )
    
    // Update global stats
    db.prepare(`
        UPDATE global_stats 
        SET total_uploads = total_uploads + 1,
            accumulated_size = accumulated_size + ?,
            last_updated = ?
        WHERE id = 1
    `).run(data.fileSize, now)
    
    return token
}

// Get upload by token
export function getUploadByToken(token) {
    if (!db) initPureStatusDB()
    
    const stmt = db.prepare(`
        SELECT * FROM uploads WHERE token = ?
    `)
    
    return stmt.get(token.toUpperCase())
}

// Mark as downloaded
export function markAsDownloaded(token, downloadedBy) {
    if (!db) initPureStatusDB()
    
    const stmt = db.prepare(`
        UPDATE uploads 
        SET downloaded = downloaded + 1,
            downloaded_at = ?,
            downloaded_by = ?
        WHERE token = ?
    `)
    
    stmt.run(Date.now(), downloadedBy, token.toUpperCase())
    
    // Update global stats
    db.prepare(`
        UPDATE global_stats 
        SET total_downloads = total_downloads + 1,
            last_updated = ?
        WHERE id = 1
    `).run(Date.now())
}

// Delete expired uploads (only from DB, URLs remain)
export function deleteExpired() {
    if (!db) initPureStatusDB()
    
    const now = Date.now()
    
    // Get expired uploads
    const expiredUploads = db.prepare(`
        SELECT * FROM uploads WHERE expires_at < ?
    `).all(now)
    
    // Delete from database
    const stmt = db.prepare(`
        DELETE FROM uploads WHERE expires_at < ?
    `)
    
    const result = stmt.run(now)
    
    return {
        deletedCount: result.changes,
        uploads: expiredUploads
    }
}

// Get all active uploads
export function getAllActiveUploads() {
    if (!db) initPureStatusDB()
    
    const now = Date.now()
    const stmt = db.prepare(`
        SELECT * FROM uploads 
        WHERE expires_at > ?
        ORDER BY created_at DESC
    `)
    
    return stmt.all(now)
}

// Get stats
export function getStats() {
    if (!db) initPureStatusDB()
    
    const now = Date.now()
    
    const active = db.prepare('SELECT COUNT(*) as count FROM uploads WHERE expires_at > ?').get(now)
    const total = db.prepare('SELECT COUNT(*) as count FROM uploads').get()
    const downloaded = db.prepare('SELECT COUNT(*) as count FROM uploads WHERE downloaded > 0').get()
    const currentSize = db.prepare('SELECT SUM(file_size) as size FROM uploads WHERE expires_at > ?').get(now)
    
    // Get global stats
    const globalStats = db.prepare('SELECT * FROM global_stats WHERE id = 1').get()
    
    return {
        active: active.count,
        total: total.count,
        downloaded: downloaded.count,
        currentSize: currentSize.size || 0,
        globalUploads: globalStats?.total_uploads || 0,
        globalDownloads: globalStats?.total_downloads || 0,
        accumulatedSize: globalStats?.accumulated_size || 0
    }
}

export { db }
