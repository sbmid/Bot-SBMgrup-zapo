import { deleteResponse } from '../../utils/responseStore.js'

export default {
    name: 'delres',
    aliases: ['deleteres', 'delrespon'],
    category: 'group',
    adminOnly: true,
    
    async execute(ctx) {
        const { send, args, chatJid, isGroup, isAdmin } = ctx
        
        if (!isGroup) {
            return await send('*[!]* Command ini hanya untuk group')
        }
        
        if (!isAdmin) {
            return await send('*[!]* Admin only command')
        }
        
        if (args.length === 0) {
            return await send('*[!]* Usage: delres <key>\n\nExample: delres baju')
        }
        
        const key = args[0].toLowerCase()
        
        try {
            const deleted = await deleteResponse(chatJid, key)
            
            if (!deleted) {
                return await send(`*[!]* Response tidak ditemukan\n\nKey: ${key}`)
            }
            
            await send(`*[+] Response Deleted*\n\nKey: ${key}`)
            
        } catch (error) {
            console.error('Delete response error:', error)
            await send(`*[!]* Failed: ${error.message}`)
        }
    }
}
