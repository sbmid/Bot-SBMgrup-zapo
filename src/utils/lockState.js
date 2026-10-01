let locked = false

/**
 * Lock bot (maintenance mode)
 */
export function lock() {
    locked = true
    console.log('🔒 Bot locked - Maintenance mode enabled')
}

/**
 * Unlock bot
 */
export function unlock() {
    locked = false
    console.log('🔓 Bot unlocked - All commands active')
}

/**
 * Check if bot is locked
 */
export function isLocked() {
    return locked
}
