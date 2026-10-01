export default {
    name: 'hidetag',
    category: 'group',
    aliases: ['h', 'tagall', 'ht'],
    adminOnly: true,
    groupOnly: true,
    
    async execute(ctx) {
        const { send, args, session, chatJid, event } = ctx
        
        // Ambil text dari args atau quoted message
        let text = args.join(' ')
        
        // Kalau reply, ambil text dari quoted message
        const quotedMsg = event.message?.extendedTextMessage?.contextInfo?.quotedMessage
        if (!text && quotedMsg) {
            text = quotedMsg.conversation || 
                   quotedMsg.extendedTextMessage?.text || 
                   quotedMsg.imageMessage?.caption || 
                   quotedMsg.videoMessage?.caption || 
                   'Tagged'
        }
        
        // Default text kalau kosong
        if (!text) {
            text = 'Tagged'
        }
        
        try {
            // Ambil semua member grup
            const groupMeta = await session.client.group.queryGroupMetadata(chatJid)
            const participants = groupMeta.participants.map(p => p.jid)
            
            // Kirim dengan raw proto untuk hidetag
            await session.client.message.send(chatJid, {
                extendedTextMessage: {
                    text: text,
                    contextInfo: {
                        mentionedJid: participants,
                        groupMentions: []
                    }
                }
            })
            
        } catch (error) {
            console.error('[hidetag] Error:', error)
            await send('*[!]* Gagal mengirim hidetag\n\n' + error.message)
        }
    }
}
