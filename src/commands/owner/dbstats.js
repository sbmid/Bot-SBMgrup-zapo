import { getStats } from '../../utils/responseStore.js'
import { isOwner } from '../../utils/helpers.js'

export default {
    name: 'dbstats',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, senderJid, event } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        try {
            const stats = getStats()
            
            let message = '*[+] Database Statistics*\n\n'
            message += `*Total Responses:* ${stats.totalResponses}\n`
            message += `*Total Groups:* ${stats.totalGroups}\n\n`
            
            if (stats.topUsed.length > 0) {
                message += '*Top 10 Most Used:*\n\n'
                stats.topUsed.forEach((item, index) => {
                    message += `${index + 1}. *${item.key}* - ${item.count}x\n`
                    message += `   ${item.text.substring(0, 40)}${item.text.length > 40 ? '...' : ''}\n\n`
                })
            }
            
            message += `*Database:* ./data/responses.db`
            
            await send(message.trim())
            
        } catch (error) {
            console.error('DB stats error:', error)
            await send(`*[!]* Failed: ${error.message}`)
        }
    }
}
