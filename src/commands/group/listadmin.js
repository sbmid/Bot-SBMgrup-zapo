import { getPhoneNumberFromLid } from '../../database/contacts.js'

export default {
    name: 'listadmin',
    description: 'List all group admins',
    category: 'group',
    groupOnly: true,
    aliases: ['admins'],
    
    async execute(ctx) {
        const { reply, session, chatJid } = ctx
        
        try {
            const metadata = await session.client.group.queryGroupMetadata(chatJid)
            const admins = metadata.participants.filter(p => p.isAdmin || p.isSuperAdmin)
            
            if (admins.length === 0) {
                return reply('No admins found (group might be corrupted)')
            }
            
            let message = `*Group Admins (${admins.length})*\n\n`
            admins.forEach((admin, i) => {
                const jid = admin.jid
                const role = admin.isSuperAdmin ? '👑' : '⭐'
                
                // Try to get phone number from LID via database mapping
                let displayNumber = jid.split('@')[0]
                if (jid.includes('@lid')) {
                    const pnJid = getPhoneNumberFromLid(jid)
                    if (pnJid) {
                        displayNumber = pnJid.split('@')[0]
                    }
                }
                
                message += `${i + 1}. ${role} +${displayNumber}\n`
            })
            
            return reply(message)
        } catch (error) {
            console.error('List admin error:', error)
            return reply(`Failed to get admin list: ${error.message}`)
        }
    }
}
