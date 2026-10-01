import { getSessionById } from '../../database/confess.js'
import db from '../../database/confess.js'

export default {
    name: 'confesslog',
    category: 'owner',
    description: 'View confess session log',
    ownerOnly: true,
    usage: 'confesslog <confess_id>',
    
    async execute(ctx) {
        const { args, reply } = ctx
        
        if (args.length === 0) {
            return reply('❌ Usage: .confesslog CF12345')
        }
        
        const confessId = args[0].replace('#', '').toUpperCase()
        
        const session = getSessionById(confessId)
        if (!session) {
            return reply(`❌ Session #${confessId} tidak ditemukan`)
        }
        
        // Get messages
        const stmt = db.prepare(`
            SELECT * FROM confess_messages 
            WHERE confess_id = ? 
            ORDER BY sent_at ASC 
            LIMIT 50
        `)
        const messages = stmt.all(confessId)
        
        const startTime = new Date(session.started_at * 1000).toLocaleString('id-ID')
        const endTime = session.ended_at ? new Date(session.ended_at * 1000).toLocaleString('id-ID') : 'Aktif'
        
        let response = 
            `📋 *CONFESS LOG*\n\n` +
            `🔢 ID: #${confessId}\n` +
            `👤 Sender: ${session.sender_jid.split('@')[0]}\n` +
            `👤 Receiver: ${session.receiver_jid.split('@')[0]}\n` +
            `📅 Started: ${startTime}\n` +
            `📅 Ended: ${endTime}\n` +
            `📊 Status: ${session.status}\n` +
            `💬 Messages: ${messages.length}\n\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `*PESAN:*\n\n`
        
        for (const msg of messages.slice(0, 20)) {
            const time = new Date(msg.sent_at * 1000).toLocaleTimeString('id-ID')
            const from = msg.from_role === 'sender' ? '📤' : '📥'
            const text = msg.message_text?.substring(0, 50) || `[${msg.media_type}]`
            response += `${from} ${time} - ${text}\n`
        }
        
        if (messages.length > 20) {
            response += `\n... dan ${messages.length - 20} pesan lainnya`
        }
        
        return reply(response)
    }
}
