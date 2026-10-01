export default {
    name: 'promote',
    description: 'Promote member to admin (admin only)',
    category: 'group',
    groupOnly: true,
    adminOnly: true,
    usage: '.promote @mention',
    
    async execute(ctx) {
        const { reply, session, chatJid, event } = ctx
        
        const mentionedJid = event.message?.extendedTextMessage?.contextInfo?.mentionedJid
        
        if (!mentionedJid || mentionedJid.length === 0) {
            return reply('Usage: .promote @mention')
        }
        
        const targetJid = mentionedJid[0]
        
        try {
            const results = await session.client.group.promoteParticipants(chatJid, [targetJid])
            const result = results[0]
            
            if (result.status === 'ok') {
                return reply(`✅ Promoted @${targetJid.split('@')[0]} to admin`, {
                    mentions: [targetJid]
                })
            } else {
                return reply(`❌ Failed to promote: Error code ${result.code}`)
            }
        } catch (error) {
            console.error('Promote participant error:', error)
            return reply(`❌ Failed to promote member: ${error.message}`)
        }
    }
}
