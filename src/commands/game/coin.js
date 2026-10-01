import { getUser, getUserRank } from '../../database/game.js'
import { getPhoneNumberFromLid } from '../../database/contacts.js'
import { formatNumber, formatPhone } from '../../utils/gameHelper.js'

export default {
    name: 'coin',
    category: 'game',
    aliases: ['balance', 'bal', 'money'],
    
    async execute(ctx) {
        const { send, senderJid, event, chatJid, isGroup } = ctx
        
        try {
            // Get phone number from LID
            const senderPnJid = event.key?.participantAlt || senderJid
            const phoneNumber = senderPnJid.split('@')[0]
            
            // Get user stats
            const user = getUser(phoneNumber)
            const globalRank = getUserRank(phoneNumber)
            const localRank = isGroup ? getUserRank(phoneNumber, chatJid) : null
            
            // Calculate XP to next level
            const xpNeeded = user.level * 100
            const xpProgress = user.xp
            const xpPercent = Math.floor((xpProgress / xpNeeded) * 100)
            
            // Win rate
            const winRate = user.total_games > 0 
                ? Math.floor((user.total_wins / user.total_games) * 100)
                : 0
            
            let message = `*[+] Your Game Stats*\n\n`
            message += `- Number: +${formatPhone(phoneNumber)}\n`
            message += `- Coins: ${formatNumber(user.coins)}\n`
            message += `- Level: ${user.level} (${xpProgress}/${xpNeeded} XP - ${xpPercent}%)\n`
            message += `\n`
            message += `- Games Played: ${formatNumber(user.total_games)}\n`
            message += `- Total Wins: ${formatNumber(user.total_wins)}\n`
            message += `- Win Rate: ${winRate}%\n`
            message += `- Win Streak: ${user.win_streak}\n`
            message += `- Best Streak: ${user.longest_streak}\n`
            message += `\n`
            message += `- Global Rank: #${globalRank}\n`
            
            if (isGroup && localRank) {
                message += `- Group Rank: #${localRank}\n`
            }
            
            message += `\n_Type .daily for daily bonus!_`
            
            await send(message)
            
        } catch (error) {
            console.error('Coin command error:', error)
            await send('*[!]* Failed to get stats')
        }
    }
}
