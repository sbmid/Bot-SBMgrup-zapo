    export default {
    name: 'demote',
    description: 'Demote admin to member (admin only)',
    category: 'group',
    groupOnly: true,
    adminOnly: true,
    usage: '.demote @mention',
    
    async execute(ctx) {
        const { reply, session, chatJid, event } = ctx
        
        const mentionedJid = event.message?.extendedTextMessage?.contextInfo?.mentionedJid
        
        if (!mentionedJid || mentionedJid.length === 0) {
            return reply('Usage: .demote @mention')
        }
        
        const targetJid = mentionedJid[0]
        
        try {
            const results = await session.client.group.demoteParticipants(chatJid, [targetJid])
            const result = results[0]
            
            if (result.status === 'ok') {
                return reply(`✅ Demoted @${targetJid.split('@')[0]} to member`, {
                    mentions: [targetJid]
                })
            } else {
                return reply(`❌ Failed to demote: Error code ${result.code}`)
            }
        } catch (error) {
            console.error('Demote participant error:', error)
            return reply(`❌ Failed to demote admin: ${error.message}`)
        }
    }
}
