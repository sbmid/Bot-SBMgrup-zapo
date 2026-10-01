export default {
    name: 'resetlink',
    description: 'Reset/rotate group invite link (admin only)',
    category: 'group',
    groupOnly: true,
    adminOnly: true,
    aliases: ['revokelink'],
    
    async execute(ctx) {
        const { reply, session, chatJid } = ctx
        
        try {
            const result = await session.client.group.revokeInvite(chatJid)
            const newLink = `https://chat.whatsapp.com/${result.code}`
            
            let message = `✅ *Invite Link Reset*\n\nNew link: ${newLink}`
            
            if (result.affectedParticipants && result.affectedParticipants.length > 0) {
                message += `\n\n⚠️ Affected ${result.affectedParticipants.length} user(s) who joined via old link`
            }
            
            return reply(message)
        } catch (error) {
            console.error('Reset invite link error:', error)
            if (error.message.includes('403')) {
                return reply('❌ Only admins can reset invite link')
            }
            return reply(`❌ Failed to reset invite link: ${error.message}`)
        }
    }
}
