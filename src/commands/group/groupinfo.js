import { getPhoneNumberFromLid } from '../../database/contacts.js'

export default {
    name: 'groupinfo',
    description: 'Show detailed group information',
    category: 'group',
    groupOnly: true,
    aliases: ['ginfo', 'infogroup'],
    
    async execute(ctx) {
        const { reply, session, chatJid } = ctx
        
        try {
            const metadata = await session.client.group.queryGroupMetadata(chatJid)
            
            const admins = metadata.participants.filter(p => p.isAdmin || p.isSuperAdmin)
            const members = metadata.participants.filter(p => !p.isAdmin && !p.isSuperAdmin)
            
            const createdDate = metadata.creation ? new Date(metadata.creation * 1000).toLocaleDateString('id-ID') : 'Unknown'
            
            // Get owner phone number from LID
            let ownerDisplay = 'Unknown'
            if (metadata.owner) {
                if (metadata.owner.includes('@lid')) {
                    const pnJid = getPhoneNumberFromLid(metadata.owner)
                    ownerDisplay = pnJid ? `+${pnJid.split('@')[0]}` : metadata.owner.split('@')[0]
                } else {
                    ownerDisplay = `+${metadata.owner.split('@')[0]}`
                }
            }
            
            let info = `*Group Information*\n\n`
            info += `*Name:* ${metadata.subject}\n`
            info += `*Created:* ${createdDate}\n`
            info += `*Owner:* ${ownerDisplay}\n\n`
            
            info += `*Members*\n`
            info += `• Total: ${metadata.participants.length}\n`
            info += `• Admins: ${admins.length}\n`
            info += `• Members: ${members.length}\n\n`
            
            info += `*Settings*\n`
            info += `• Messages: ${metadata.announce ? 'Admins only' : 'All members'}\n`
            info += `• Edit info: ${metadata.restrict ? 'Admins only' : 'All members'}\n`
            info += `• Ephemeral: ${metadata.ephemeral ? 'On' : 'Off'}\n\n`
            
            if (metadata.desc) {
                info += `*Description:*\n${metadata.desc}`
            }
            
            return reply(info)
        } catch (error) {
            console.error('Group info error:', error)
            return reply(`Failed to get group info: ${error.message}`)
        }
    }
}
