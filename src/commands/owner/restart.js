import { isOwner } from '../../utils/helpers.js'

export default {
    name: 'restart',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, senderJid, event } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        await send('*[+] Restarting Bot*\n\nBot will be back online in 3-5 seconds...')
        
        setTimeout(() => {
            console.log('Bot restart requested by owner')
            process.exit(0) // Server will auto-restart
        }, 3000)
    }
}

