import { isOwner } from '../../utils/helpers.js'

export default {
    name: 'broadcast',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, session, args, senderJid, event } = ctx
        
        // Check if owner (with participantAlt support)
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        if (args.length === 0) {
            return await send('*[!]* Usage: broadcast <message>')
        }
        
        const message = args.join(' ')
        
        try {
            const groups = await session.client.group.queryAllGroups()
            
            await send(`*[+] Broadcasting to ${groups.length} groups...*`)
            
            let success = 0
            let failed = 0
            
            for (const group of groups) {
                try {
                    await session.client.message.send(group.jid, `*[+] Broadcast*\n\n${message}`)
                    success++
                    await new Promise(resolve => setTimeout(resolve, 1000)) // Delay 1s
                } catch (error) {
                    failed++
                }
            }
            
            await send(`*[+] Broadcast Complete*\n- Success: ${success}\n- Failed: ${failed}`)
        } catch (error) {
            await send('*[!]* Failed to broadcast')
        }
    }
}
