import { getUser, addCoins, updateGameStats, updateGroupStats } from '../database/game.js'

/**
 * Cooldown tracking (in-memory, resets on restart)
 * ponytail: Simple Map, no need for DB persistence
 */
const cooldowns = new Map()

/**
 * Check cooldown
 */
export function checkCooldown(phoneNumber, gameType, seconds) {
    const key = `${phoneNumber}:${gameType}`
    const now = Date.now()
    const lastPlayed = cooldowns.get(key) || 0
    const diff = (now - lastPlayed) / 1000
    
    if (diff < seconds) {
        return {
            onCooldown: true,
            remaining: Math.ceil(seconds - diff)
        }
    }
    
    cooldowns.set(key, now)
    return { onCooldown: false }
}

/**
 * Calculate game rewards
 */
export function calculateReward(gameType, won, attempts = 1) {
    const rewards = {
        // Existing
        suit: { win: 50, lose: 10, draw: 20, xp_win: 20, xp_lose: 5 },
        flip: { win: 50, lose: 10, xp_win: 20, xp_lose: 5 },
        slot: { win: 100, lose: 10, jackpot: 500, xp_win: 30, xp_lose: 5 },
        tebakgambar: { win: 75, lose: 10, xp_win: 25, xp_lose: 5 },
        tebakhewan: { win: 60, lose: 10, xp_win: 20, xp_lose: 5 },
        // New games
        tebakkalimat: { win: 50, lose: 10, xp_win: 15, xp_lose: 5 },
        tebakkata: { win: 50, lose: 10, xp_win: 15, xp_lose: 5 },
        tebaktebakan: { win: 50, lose: 10, xp_win: 15, xp_lose: 5 },
        tebakwarna: { win: 70, lose: 10, xp_win: 22, xp_lose: 5 },
        tebakbendera: { win: 65, lose: 10, xp_win: 20, xp_lose: 5 },
        tebakkartun: { win: 65, lose: 10, xp_win: 20, xp_lose: 5 },
        tebakgame: { win: 70, lose: 10, xp_win: 22, xp_lose: 5 },
        karakterff: { win: 70, lose: 10, xp_win: 22, xp_lose: 5 },
        tebakangka: { 
            win: [100, 75, 50, 25],
            lose: 10,
            xp_win: 30,
            xp_lose: 5
        }
    }
    
    const config = rewards[gameType]
    if (!config) return { coins: 0, xp: 0 }
    
    // Special handling for tebakangka
    if (gameType === 'tebakangka' && won) {
        let coinReward
        if (attempts <= 3) coinReward = config.win[0]
        else if (attempts <= 7) coinReward = config.win[1]
        else if (attempts <= 10) coinReward = config.win[2]
        else coinReward = config.win[3]
        
        return { coins: coinReward, xp: config.xp_win }
    }
    
    // Standard games
    if (won) {
        return { coins: config.win, xp: config.xp_win }
    } else if (gameType === 'suit' && won === null) {
        // Draw
        return { coins: config.draw, xp: 10 }
    } else {
        return { coins: config.lose, xp: config.xp_lose }
    }
}

/**
 * Process game result
 */
export function processGameResult(phoneNumber, groupJid, gameType, won, attempts = 1) {
    const { coins, xp } = calculateReward(gameType, won, attempts)
    
    // Update global stats
    addCoins(phoneNumber, coins, gameType, won ? 'Win' : 'Lose')
    updateGameStats(phoneNumber, won, xp)
    
    // Update group stats if in group
    if (groupJid) {
        updateGroupStats(phoneNumber, groupJid, coins, won)
    }
    
    // Check streak bonus
    const user = getUser(phoneNumber)
    let streakBonus = 0
    
    if (won && user.win_streak > 0) {
        if (user.win_streak === 5) {
            streakBonus = 50
            addCoins(phoneNumber, streakBonus, 'streak', '5-win streak bonus')
        } else if (user.win_streak === 10) {
            streakBonus = 100
            addCoins(phoneNumber, streakBonus, 'streak', '10-win streak bonus')
        }
    }
    
    return {
        coins,
        xp,
        streakBonus,
        newStreak: user.win_streak + (won ? 1 : 0),
        totalCoins: user.coins + coins + streakBonus
    }
}

/**
 * Format phone number for display
 */
export function formatPhone(phone) {
    if (phone.length <= 4) return phone
    return phone.slice(0, -4) + 'xxx'
}

/**
 * Format number with separators
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
