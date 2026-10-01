import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = './data/game.db'

// Ensure data directory exists
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true })
}

const db = new Database(DB_PATH)

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL')

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        phone_number TEXT PRIMARY KEY,
        coins INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        total_games INTEGER DEFAULT 0,
        total_wins INTEGER DEFAULT 0,
        win_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_daily TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_stats (
        phone_number TEXT,
        group_jid TEXT,
        group_coins INTEGER DEFAULT 0,
        group_wins INTEGER DEFAULT 0,
        group_games INTEGER DEFAULT 0,
        last_played TIMESTAMP,
        PRIMARY KEY (phone_number, group_jid),
        FOREIGN KEY (phone_number) REFERENCES users(phone_number)
    );

    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT,
        type TEXT,
        amount INTEGER,
        game_type TEXT,
        description TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (phone_number) REFERENCES users(phone_number)
    );

    CREATE INDEX IF NOT EXISTS idx_users_coins ON users(coins DESC);
    CREATE INDEX IF NOT EXISTS idx_group_stats ON group_stats(group_jid, group_coins DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions ON transactions(phone_number, timestamp);
`)

/**
 * Get or create user
 */
export function getUser(phoneNumber) {
    let user = db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phoneNumber)
    
    if (!user) {
        db.prepare(`
            INSERT INTO users (phone_number) VALUES (?)
        `).run(phoneNumber)
        
        user = db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phoneNumber)
    }
    
    return user
}

/**
 * Update user coins
 */
export function addCoins(phoneNumber, amount, type, description) {
    // Ensure user exists
    getUser(phoneNumber)
    
    db.prepare(`
        UPDATE users 
        SET coins = coins + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE phone_number = ?
    `).run(amount, phoneNumber)
    
    // Log transaction
    db.prepare(`
        INSERT INTO transactions (phone_number, type, amount, game_type, description)
        VALUES (?, ?, ?, ?, ?)
    `).run(phoneNumber, type, amount, type, description)
}

/**
 * Update game stats
 */
export function updateGameStats(phoneNumber, won, xp) {
    const user = getUser(phoneNumber)
    const newStreak = won ? user.win_streak + 1 : 0
    const newLongestStreak = Math.max(user.longest_streak, newStreak)
    
    db.prepare(`
        UPDATE users
        SET total_games = total_games + 1,
            total_wins = total_wins + ?,
            win_streak = ?,
            longest_streak = ?,
            xp = xp + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE phone_number = ?
    `).run(won ? 1 : 0, newStreak, newLongestStreak, xp, phoneNumber)
    
    // Check level up
    checkLevelUp(phoneNumber)
}

/**
 * Update group-specific stats
 */
export function updateGroupStats(phoneNumber, groupJid, coins, won) {
    // Get or create group stat
    let stat = db.prepare(`
        SELECT * FROM group_stats WHERE phone_number = ? AND group_jid = ?
    `).get(phoneNumber, groupJid)
    
    if (!stat) {
        db.prepare(`
            INSERT INTO group_stats (phone_number, group_jid) VALUES (?, ?)
        `).run(phoneNumber, groupJid)
    }
    
    db.prepare(`
        UPDATE group_stats
        SET group_coins = group_coins + ?,
            group_games = group_games + 1,
            group_wins = group_wins + ?,
            last_played = CURRENT_TIMESTAMP
        WHERE phone_number = ? AND group_jid = ?
    `).run(coins, won ? 1 : 0, phoneNumber, groupJid)
}

/**
 * Check and handle level up
 */
function checkLevelUp(phoneNumber) {
    const user = getUser(phoneNumber)
    const xpNeeded = user.level * 100
    
    if (user.xp >= xpNeeded) {
        const newLevel = user.level + 1
        const bonusCoins = 200
        
        db.prepare(`
            UPDATE users
            SET level = ?,
                xp = xp - ?,
                coins = coins + ?
            WHERE phone_number = ?
        `).run(newLevel, xpNeeded, bonusCoins, phoneNumber)
        
        // Log level up
        addCoins(phoneNumber, 0, 'levelup', `Level ${newLevel}`)
        
        console.log(`[GAME] Level up! ${phoneNumber} → Level ${newLevel}`)
        
        return true
    }
    
    return false
}

/**
 * Get daily claim status
 */
export function canClaimDaily(phoneNumber) {
    const user = getUser(phoneNumber)
    
    if (!user.last_daily) return true
    
    const lastDaily = new Date(user.last_daily)
    const now = new Date()
    const diff = now - lastDaily
    const hours = diff / (1000 * 60 * 60)
    
    return hours >= 24
}

/**
 * Claim daily bonus
 */
export function claimDaily(phoneNumber) {
    const bonus = 100
    
    db.prepare(`
        UPDATE users
        SET coins = coins + ?,
            last_daily = CURRENT_TIMESTAMP
        WHERE phone_number = ?
    `).run(bonus, phoneNumber)
    
    addCoins(phoneNumber, 0, 'daily', 'Daily bonus')
    
    return bonus
}

/**
 * Get leaderboard
 */
export function getLeaderboard(type = 'global', groupJid = null, limit = 10) {
    if (type === 'local' && groupJid) {
        return db.prepare(`
            SELECT gs.phone_number, gs.group_coins as coins, gs.group_wins as wins, gs.group_games as games
            FROM group_stats gs
            WHERE gs.group_jid = ?
            ORDER BY gs.group_coins DESC
            LIMIT ?
        `).all(groupJid, limit)
    }
    
    // Global leaderboard
    return db.prepare(`
        SELECT phone_number, coins, level, total_wins, total_games
        FROM users
        WHERE coins > 0
        ORDER BY coins DESC
        LIMIT ?
    `).all(limit)
}

/**
 * Get user rank
 */
export function getUserRank(phoneNumber, groupJid = null) {
    if (groupJid) {
        const result = db.prepare(`
            SELECT COUNT(*) + 1 as rank
            FROM group_stats
            WHERE group_jid = ? AND group_coins > (
                SELECT COALESCE(group_coins, 0) FROM group_stats
                WHERE phone_number = ? AND group_jid = ?
            )
        `).get(groupJid, phoneNumber, groupJid)
        
        return result?.rank || 0
    }
    
    // Global rank
    const result = db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM users
        WHERE coins > (SELECT COALESCE(coins, 0) FROM users WHERE phone_number = ?)
    `).get(phoneNumber)
    
    return result?.rank || 0
}

export default db
