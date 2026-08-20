import { listResponses } from '../../utils/responseStore.js'

export default {
    name: 'listres',
    aliases: ['listrespon'],
    category: 'group',
    adminOnly: true,
    
    async execute(ctx) {
        const { send, chatJid, isGroup, isAdmin } = ctx
        
        if (!isGroup) {
            return await send('*[!]* Command ini hanya untuk group')
        }
        
        if (!isAdmin) {
            return await send('*[!]* Admin only command')
        }
        
        try {
            const responses = await listResponses(chatJid)
            
            if (responses.length === 0) {
                return await send('*[+]* No Responses\n\nBelum ada auto-response.\n\nTambahkan dengan: addres key@text')
            }
            
            let message = `*[+] Auto Responses*\n\n`
            message += `Total: ${responses.length}\n\n`
            
            responses.forEach((item, index) => {
                message += `*${index + 1}. ${item.key}*\n`
                message += `Response: ${item.text.substring(0, 50)}${item.text.length > 50 ? '...' : ''}\n`
                message += `Used: ${item.count}x\n\n`
            })
            
            await send(message.trim())
            
        } catch (error) {
            console.error('List responses error:', error)
            await send(`*[!]* Failed: ${error.message}`)
        }
    }
}
