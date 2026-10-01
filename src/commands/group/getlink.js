export default {
    name: 'getlink',
    description: 'Get group invite link (admin only)',
    category: 'group',
    groupOnly: true,
    adminOnly: true,
    aliases: ['link'],
    
    async execute(ctx) {
        const { reply, session, chatJid } = ctx
        
        try {
            const code = await session.client.group.queryInviteCode(chatJid)
            const link = `https://chat.whatsapp.com/${code}`
            
            return reply(`🔗 *Group Invite Link*\n\n${link}`)
        } catch (error) {
            console.error('Get invite link error:', error)
            if (error.message.includes('403')) {
                return reply('❌ Only admins can get invite link')
            }
            return reply(`❌ Failed to get invite link: ${error.message}`)
        }
    }
}
