import { getActiveSession, endSession, getSessionRole } from '../../database/confess.js'

export default {
    name: 'end',
    category: 'chat',
    description: 'End active confess session',
    privateOnly: true,
    
    async execute(ctx) {
        const { reply, event, session } = ctx
        const userJid = event.key.remoteJid
        const chatJid = event.key.remoteJid
        
        // Check if in group (reject)
        if (chatJid?.endsWith('@g.us')) {
            return reply('❌ Fitur confess hanya bisa digunakan di private chat')
        }
        
        const activeSession = getActiveSession(userJid)
        
        if (!activeSession) {
            return reply('❌ Tidak ada session confess aktif')
        }
        
        const role = getSessionRole(userJid, activeSession.confess_id)
        const otherJid = role === 'sender' ? activeSession.receiver_jid : activeSession.sender_jid
        
        // End session
        endSession(activeSession.confess_id)
        
        // Notify both parties
        await reply(
            `✅ *Session Berakhir*\n\n` +
            `🔢 ID: #${activeSession.confess_id}\n` +
            `💬 Total pesan: ${activeSession.sender_msg_count + activeSession.receiver_msg_count}\n\n` +
            `Terima kasih telah menggunakan fitur confess!`
        )
        
        await session.client.message.send(otherJid, {
            type: 'text',
            text: 
                `━━━━━━━━━━━━━━━━\n` +
                `💌 *SESSION BERAKHIR*\n` +
                `━━━━━━━━━━━━━━━━\n\n` +
                `Session confess #${activeSession.confess_id} telah berakhir.\n\n` +
                `Terima kasih!`
        })
    }
}
