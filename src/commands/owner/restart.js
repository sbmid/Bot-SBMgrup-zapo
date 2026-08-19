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
        
        await send('*[+] Restarting Bot*\n\nBot will restart in 3 seconds...')
        
        setTimeout(() => {
            console.log('Bot restart requested by owner')
            process.exit(0) // Exit with code 0 (clean exit)
            // PM2 or nodemon will auto-restart
        }, 3000)
    }
}
