import { canClaimDaily, claimDaily, getUser } from '../../database/game.js'
import { getPhoneNumberFromLid } from '../../database/contacts.js'
import { formatNumber } from '../../utils/gameHelper.js'

export default {
    name: 'daily',
    category: 'game',
    aliases: ['claim'],
    
    async execute(ctx) {
        const { send, senderJid, event } = ctx
        
        try {
            // Get phone number from LID
            const senderPnJid = event.key?.participantAlt || senderJid
            const phoneNumber = senderPnJid.split('@')[0]
            
            // Check if can claim
            if (!canClaimDaily(phoneNumber)) {
                const user = getUser(phoneNumber)
                const lastDaily = new Date(user.last_daily)
                const nextDaily = new Date(lastDaily.getTime() + 24 * 60 * 60 * 1000)
                const now = new Date()
                const diff = nextDaily - now
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                
                return await send(
                    `*[+] Daily Bonus*\n\n` +
                    `Already claimed today!\n\n` +
                    `Next claim in: *${hours}h ${minutes}m*`
                )
            }
            
            // Claim daily
            const bonus = claimDaily(phoneNumber)
            const user = getUser(phoneNumber)
            
            await send(
                `*[+] Daily Bonus Claimed!*\n\n` +
                `+${bonus} coins\n\n` +
                `New Balance: ${formatNumber(user.coins)} coins\n\n` +
                `_Come back tomorrow for another bonus!_`
            )
            
        } catch (error) {
            console.error('Daily command error:', error)
            await send('*[!]* Failed to claim daily bonus')
        }
    }
}
