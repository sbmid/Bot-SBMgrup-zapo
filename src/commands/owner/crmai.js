export default {
    name: 'crmai',
    category: 'owner',
    aliases: ['copyai', 'fwdai'],
    ownerOnly: true,
    
    async execute(ctx) {
        const { reply, event, session, args } = ctx
        
        // Check if replying to a message
        const contextInfo = event.message?.extendedTextMessage?.contextInfo
        if (!contextInfo?.quotedMessage) {
            return await reply(
                '*[!] Copy Meta AI Response*\n\n' +
                'Usage: Reply ke message Meta AI lalu ketik:\n' +
                '`.crmai <target>`\n\n' +
                'Target:\n' +
                '- `me` = kirim ke chat pribadi owner\n' +
                '- `628xxx` = kirim ke nomor WA\n' +
                '- `120363xxx@g.us` = kirim ke group JID\n\n' +
                'Example:\n' +
                '`.crmai me` - kirim ke diri sendiri\n' +
                '`.crmai 628123456789` - kirim ke nomor'
            )
        }
        
        // Get target
        const targetInput = args[0]
        if (!targetInput) {
            return await reply('*[!]* Target tidak ada\n\nContoh: `.crmai me` atau `.crmai 628xxx`')
        }
        
        // Parse target JID
        let targetJid
        if (targetInput.toLowerCase() === 'me') {
            // Send to owner (get from event)
            targetJid = event.key.participant || event.key.remoteJid
            // Convert to direct chat JID (remove @lid if exists, use phone number)
            if (targetJid.includes('@lid')) {
                const { getPhoneNumberFromLid } = await import('../../database/contacts.js')
                targetJid = getPhoneNumberFromLid(targetJid) || targetJid
            }
        } else if (targetInput.includes('@g.us')) {
            // Group JID
            targetJid = targetInput
        } else {
            // Phone number - convert to WA JID
            const cleanNumber = targetInput.replace(/[^0-9]/g, '')
            targetJid = `${cleanNumber}@s.whatsapp.net`
        }
        
        try {
            // Build quoted message object for copying
            const quotedMessage = {
                key: {
                    remoteJid: event.key.remoteJid,
                    id: contextInfo.stanzaId,
                    participant: contextInfo.participant
                },
                message: contextInfo.quotedMessage,
                pushName: contextInfo.pushName || 'Meta AI',
                participant: contextInfo.participant
            }
            
            // Check if quoted message is from a bot
            const isFromBot = contextInfo.participant?.includes('@s.whatsapp.net') && 
                             event.key.remoteJid.includes('@bot')
            
            if (!isFromBot) {
                return await reply('*[!]* Message yang di-reply bukan dari bot (Meta AI)\n\nReply ke response Meta AI dulu!')
            }
            
            // Extract preview text
            const previewText = quotedMessage.message.conversation || 
                               quotedMessage.message.extendedTextMessage?.text ||
                               quotedMessage.message.imageMessage?.caption ||
                               '[Media/Special Message]'
            
            // Send copied message to target (rebuild proto message)
            await session.client.message.send(targetJid, quotedMessage.message)
            
            // Send forwarding info message
            const targetDisplay = targetInput === 'me' ? 'diri sendiri' : 
                                 targetJid.includes('@g.us') ? 'group' : targetInput
            
            const forwardInfo = `📋 *Meta AI Response Copied*\n\n` +
                              `To: ${targetDisplay}\n` +
                              `From: ${quotedMessage.pushName}\n\n` +
                              `Preview:\n${previewText.substring(0, 150)}${previewText.length > 150 ? '...' : ''}`
            
            await session.client.message.send(targetJid, {
                type: 'text',
                text: forwardInfo
            })
            
            // Confirmation to sender
            await reply(`✅ Message copied & forwarded to *${targetDisplay}*`)
            
        } catch (error) {
            console.error('CRMAI error:', error)
            await reply(`*[!]* Failed to copy Meta AI response\n\n${error.message}`)
        }
    }
}
