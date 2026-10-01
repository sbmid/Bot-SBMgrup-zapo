import { unblockUser } from '../../database/confess.js'

export default {
    name: 'unblockconfess',
    category: 'owner',
    description: 'Unblock user from confess',
    ownerOnly: true,
    usage: 'unblockconfess 628xxx',
    
    async execute(ctx) {
        const { args, reply } = ctx
        
        if (args.length === 0) {
            return reply('❌ Usage: .unblockconfess 628xxx')
        }
        
        let targetJid = args[0]
        targetJid = targetJid.replace(/\D/g, '')
        if (targetJid.startsWith('0')) targetJid = '62' + targetJid.substring(1)
        if (!targetJid.startsWith('62')) targetJid = '62' + targetJid
        targetJid = targetJid + '@s.whatsapp.net'
        
        unblockUser(targetJid)
        
        return reply(
            `✅ *User Dibuka Blokirnya*\n\n` +
            `👤 JID: ${targetJid}\n\n` +
            `User sekarang bisa menggunakan confess lagi`
        )
    }
}
