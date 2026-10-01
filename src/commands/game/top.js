import { getLeaderboard, getUserRank, getUser } from '../../database/game.js'
import { getPhoneNumberFromLid } from '../../database/contacts.js'
import { formatNumber, formatPhone } from '../../utils/gameHelper.js'

export default {
    name: 'top',
    category: 'game',
    aliases: ['leaderboard', 'lb', 'rank'],
    
    async execute(ctx) {
        const { send, senderJid, event, args, chatJid, isGroup } = ctx
        
        try {
            // Get phone number from LID
            const senderPnJid = event.key?.participantAlt || senderJid
            const phoneNumber = senderPnJid.split('@')[0]
            
            // Determine type: local or global
            const type = args[0]?.toLowerCase() === 'global' ? 'global' : 'local'
            
            // Get leaderboard
            const leaderboard = type === 'local' && isGroup
                ? getLeaderboard('local', chatJid, 10)
                : getLeaderboard('global', null, 10)
            
            if (leaderboard.length === 0) {
                return await send('*[📊] Leaderboard*\n\nNo data yet. Play games to appear here!')
            }
            
            // Build message
            const title = type === 'local' 
                ? '*[+] Local Leaderboard*\n\n_This Group Only_\n\n'
                : '*[+] Global Leaderboard*\n\n_All Groups_\n\n'
            
            let message = title
            
            leaderboard.forEach((user, index) => {
                const rank = index + 1
                const emoji = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
                const prefix = emoji || `${rank}.`
                const phone = formatPhone(user.phone_number)
                const coins = formatNumber(user.coins)
                
                message += `${prefix} +${phone} - ${coins} coins\n`
            })
            
            // Show user's rank
            const userRank = type === 'local' && isGroup
                ? getUserRank(phoneNumber, chatJid)
                : getUserRank(phoneNumber)
            
            const user = getUser(phoneNumber)
            
            message += `\n━━━━━━━━━━━━━━━\n`
            message += `Your Rank: #${userRank} (${formatNumber(user.coins)} coins)\n`
            
            if (type === 'local') {
                message += `\n_Type .top global for global ranking_`
            } else {
                message += `\n_Type .top local for group ranking_`
            }
            
            await send(message)
            
        } catch (error) {
            console.error('Top command error:', error)
            await send('*[!]* Failed to get leaderboard')
        }
    }
}
