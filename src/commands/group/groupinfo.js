export default {
    name: 'groupinfo',
    description: 'Show group information',
    category: 'group',
    
    async execute(ctx) {
        const { send, session, isGroup, chatJid } = ctx
        
        if (!isGroup) {
            return await send('*[!]* This command is for groups only')
        }
        
        try {
            const metadata = await session.client.group.queryGroupMetadata(chatJid)
            
            const admins = metadata.participants.filter(p => p.isAdmin)
            const members = metadata.participants.filter(p => !p.isAdmin)
            
            const info = `*[+] Group Information*

- Name: ${metadata.subject}
- JID: ${chatJid}
- Created: ${new Date(metadata.creation * 1000).toLocaleDateString()}
- Owner: ${metadata.owner || 'Unknown'}

*[+] Members*
- Total: ${metadata.participants.length}
- Admins: ${admins.length}
- Members: ${members.length}

*[+] Settings*
- Announcement: ${metadata.announce ? 'Yes' : 'No'}
- Restrict: ${metadata.restrict ? 'Yes' : 'No'}`

            await send(info)
        } catch (error) {
            await send('*[!]* Failed to get group info')
        }
    }
}
