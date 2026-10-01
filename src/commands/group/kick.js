export default {
    name: 'kick',
    description: 'Kick member from group (admin only)',
    category: 'group',
    groupOnly: true,
    adminOnly: true,
    usage: '.kick @mention',
    
    async execute(ctx) {
        const { reply, session, chatJid, event } = ctx
        
        // Get JID from mention
        const mentionedJid = event.message?.extendedTextMessage?.contextInfo?.mentionedJid
        
        if (!mentionedJid || mentionedJid.length === 0) {
            return reply('Usage: .kick @mention')
        }
        
        const targetJid = mentionedJid[0]
        
        // Prevent kicking bot itself
        const botJid = session.client.getCredentials()?.meJid
        if (targetJid === botJid) {
            return reply('❌ Cannot kick myself')
        }
        
        try {
            const results = await session.client.group.removeParticipants(chatJid, [targetJid])
            const result = results[0]
            
            if (result.status === 'ok') {
                return reply(`✅ Kicked @${targetJid.split('@')[0]}`, {
                    mentions: [targetJid]
                })
            } else {
                return reply(`❌ Failed to kick: Error code ${result.code}`)
            }
        } catch (error) {
            console.error('Kick participant error:', error)
            return reply(`❌ Failed to kick member: ${error.message}`)
        }
    }
}
