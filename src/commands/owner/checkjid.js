export default {
    name: 'checkjid',
    category: 'owner',
    
    async execute(ctx) {
        const { send, event, isGroup, chatJid, senderJid } = ctx
        
        const info = `*[+] JID Information*

*Chat:*
- JID: ${chatJid}
- Type: ${isGroup ? 'Group' : 'Private'}

*Sender:*
- JID: ${event.key?.remoteJid}
- Participant: ${event.key?.participant || 'N/A'}
- From Me: ${event.key?.fromMe ? 'Yes' : 'No'}

*Message:*
- ID: ${event.key?.id}

*Raw Key:*
\`\`\`
${JSON.stringify(event.key, null, 2)}
\`\`\``

        await send(info)
    }
}
