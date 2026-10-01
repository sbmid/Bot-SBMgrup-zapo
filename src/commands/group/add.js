export default {
    name: 'add',
    description: 'Add member to group (admin only)',
    category: 'group',
    groupOnly: true,
    adminOnly: true,
    usage: '.add 628xxx or .add @mention',
    
    async execute(ctx) {
        const { reply, session, chatJid, args, event } = ctx
        
        // Get JID from args or mentions
        let targetJid
        
        if (event.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            targetJid = event.message.extendedTextMessage.contextInfo.mentionedJid[0]
        } else if (args[0]) {
            // Parse phone number
            let phone = args[0].replace(/[^0-9]/g, '')
            if (!phone.startsWith('62')) {
                if (phone.startsWith('0')) phone = '62' + phone.substring(1)
                else phone = '62' + phone
            }
            targetJid = phone + '@s.whatsapp.net'
        } else {
            return reply('Usage: .add 628xxx or .add @mention')
        }
        
        try {
            const results = await session.client.group.addParticipants(chatJid, [targetJid])
            const result = results[0]
            
            if (result.status === 'ok') {
                return reply(`✅ Successfully added @${targetJid.split('@')[0]}`, {
                    mentions: [targetJid]
                })
            } else {
                const errorMessages = {
                    403: 'Privacy settings prevent adding this user',
                    408: 'Not allowed to add this user',
                    409: 'User already in group',
                    404: 'User not on WhatsApp'
                }
                return reply(`❌ Failed: ${errorMessages[result.code] || `Error code ${result.code}`}`)
            }
        } catch (error) {
            console.error('Add participant error:', error)
            return reply(`❌ Failed to add member: ${error.message}`)
        }
    }
}
