export default {
    name: 'crm',
    category: 'owner',
    aliases: ['getmeta', 'rawmsg', 'metadata'],
    ownerOnly: true,
    
    async execute(ctx) {
        const { reply, event } = ctx
        
        // Get quoted message or current message
        const targetEvent = event.message?.extendedTextMessage?.contextInfo?.quotedMessage 
            ? { 
                key: event.message.extendedTextMessage.contextInfo.stanzaId 
                    ? {
                        remoteJid: event.key.remoteJid,
                        id: event.message.extendedTextMessage.contextInfo.stanzaId,
                        participant: event.message.extendedTextMessage.contextInfo.participant
                    }
                    : event.key,
                message: event.message.extendedTextMessage.contextInfo.quotedMessage
            }
            : event
        
        try {
            // Format message metadata sebagai JSON indented
            const metadata = {
                key: targetEvent.key,
                message: targetEvent.message,
                timestampSeconds: targetEvent.timestampSeconds,
                pushName: targetEvent.pushName,
                participant: event.key?.participant,
                remoteJid: event.key?.remoteJid
            }
            
            // Convert to formatted JSON string
            const jsonString = JSON.stringify(metadata, null, 2)
            
            // Format response
            const response = `*[+] GET META DATA*\n\n\`\`\`json\n${jsonString}\n\`\`\``
            
            // Check if response too long for WA (max ~65KB)
            if (response.length > 60000) {
                // Split atau kirim sebagai document
                return await reply(
                    `*[+] GET META DATA*\n\n` +
                    `⚠️ Data too large (${(response.length / 1024).toFixed(2)} KB)\n\n` +
                    `Showing first 50000 chars:\n\n` +
                    `\`\`\`json\n${jsonString.substring(0, 50000)}\n...\n\`\`\``
                )
            }
            
            await reply(response)
            
        } catch (error) {
            console.error('CRM error:', error)
            await reply(`*[!]* Failed to get metadata\n\n${error.message}`)
        }
    }
}
