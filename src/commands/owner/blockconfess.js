import { blockUser } from '../../database/confess.js'

export default {
    name: 'blockconfess',
    category: 'owner',
    description: 'Block user from using confess',
    ownerOnly: true,
    usage: 'blockconfess 628xxx [reason]',
    
    async execute(ctx) {
        const { args, reply, event } = ctx
        
        if (args.length === 0) {
            return reply('❌ Usage: .blockconfess 628xxx [alasan]')
        }
        
        let targetJid = args[0]
        targetJid = targetJid.replace(/\D/g, '')
        if (targetJid.startsWith('0')) targetJid = '62' + targetJid.substring(1)
        if (!targetJid.startsWith('62')) targetJid = '62' + targetJid
        targetJid = targetJid + '@s.whatsapp.net'
        
        const reason = args.slice(1).join(' ') || 'Melanggar aturan'
        const blockedBy = event.key.participant || event.key.remoteJid
        
        blockUser(targetJid, blockedBy, reason)
        
        return reply(
            `✅ *User Diblokir*\n\n` +
            `👤 JID: ${targetJid}\n` +
            `📝 Alasan: ${reason}\n\n` +
            `User tidak bisa menggunakan fitur confess`
        )
    }
}
