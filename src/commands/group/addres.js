import { addResponse } from '../../utils/responseStore.js'

export default {
    name: 'addres',
    aliases: ['addrespon'],
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
            return await send(
                '*[!]* Usage: addres <key>@<text>\n\n' +
                'Example: addres baju@Stok: 10 pcs\n\n' +
                'Member can trigger with: baju'
            )
        }
        
        const input = args.join(' ')
        const parts = input.split('@')
        
        if (parts.length < 2) {
            return await send('*[!]* Format salah!\n\nGunakan: key@response text')
        }
        
        const key = parts[0].trim().toLowerCase()
        const text = parts.slice(1).join('@').trim()
        
        if (!key || !text) {
            return await send('*[!]* Key dan text tidak boleh kosong')
        }
        
        try {
            await addResponse(chatJid, key, text)
            
            await send(
                `*[+] Response Added*\n\n` +
                `*Key:* ${key}\n` +
                `*Response:* ${text}\n\n` +
                `Member can trigger by typing: ${key}`
            )
        } catch (error) {
            console.error('Add response error:', error)
            await send(`*[!]* Failed: ${error.message}`)
        }
    }
}
