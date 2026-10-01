 import axios from 'axios'
import { getActiveSession, createSession, endSession, isBlocked, getUserStats } from '../../database/confess.js'
import { getUser, addCoins } from '../../database/game.js'
import { getPhoneNumberFromLid } from '../../database/contacts.js'

// Generate random confess ID
function generateConfessId() {
    return 'CF' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Format phone number
function formatPhone(phone) {
    phone = phone.replace(/\D/g, '')
    if (phone.startsWith('0')) phone = '62' + phone.substring(1)
    if (!phone.startsWith('62')) phone = '62' + phone
    return phone + '@s.whatsapp.net'
}

export default {
    name: 'confess',
    category: 'chat',
    description: 'Send anonymous confess message',
    aliases: ['menfess'],
    privateOnly: true,
    usage: 'confess 628xxx\n(lalu kirim pesan langsung untuk memulai)',
    
    async execute(ctx) {
        const { args, reply, session, event } = ctx
        const senderJid = event.key.remoteJid
        const chatJid = event.key.remoteJid
        
        // Check if in group (reject)
        if (chatJid?.endsWith('@g.us')) {
            return reply('❌ Fitur confess hanya bisa digunakan di private chat')
        }
        
        // Get actual phone number (prioritize remoteJidAlt for LID)
        const actualJid = event.key.remoteJidAlt || event.key.remoteJid
        let phoneNumber = actualJid.split('@')[0]
        
        // If still LID format, try database mapping
        if (actualJid.includes('@lid')) {
            const mappedPhone = await getPhoneNumberFromLid(actualJid)
            if (mappedPhone) {
                phoneNumber = mappedPhone
            }
        }
        
        console.log('[Confess] Sender JID:', senderJid)
        console.log('[Confess] Actual JID:', actualJid)
        console.log('[Confess] Phone number:', phoneNumber)
        
        // Check if blocked
        if (isBlocked(senderJid)) {
            return reply('❌ Kamu diblokir dari menggunakan fitur confess')
        }
        
        // Check active session
        const activeSession = getActiveSession(senderJid)
        
        // No args = check session status
        if (args.length === 0) {
            if (!activeSession) {
                const stats = getUserStats(senderJid)
                return reply(
                    `💌 *CONFESS*\n\n` +
                    `📊 Statistik:\n` +
                    `• Terkirim: ${stats.sent}\n` +
                    `• Diterima: ${stats.received}\n\n` +
                    `💡 *Cara Pakai:*\n` +
                    `.confess 628xxx\n\n` +
                    `Biaya: 20 coins per pesan\n` +
                    `Balasan: GRATIS unlimited`
                )
            }
            
            const role = activeSession.sender_jid === senderJid ? 'Pengirim' : 'Penerima'
            const startTime = new Date(activeSession.started_at * 1000)
            const elapsed = Math.floor((Date.now() / 1000 - activeSession.started_at) / 60)
            
            return reply(
                `📱 *Session Aktif*\n\n` +
                `🔢 ID: #${activeSession.confess_id}\n` +
                `👤 Role: ${role}\n` +
                `⏰ Dimulai: ${elapsed} menit lalu\n` +
                `💬 Pesan: ${activeSession.sender_msg_count} kirim, ${activeSession.receiver_msg_count} terima\n\n` +
                `💡 Ketik .end untuk mengakhiri`
            )
        }
        
        // Has args = start new confess
        if (activeSession) {
            return reply(
                `❌ Kamu masih punya session aktif!\n\n` +
                `🔢 ID: #${activeSession.confess_id}\n` +
                `💡 Ketik .end untuk mengakhiri session sebelum buat yang baru`
            )
        }
        
        // Validate phone number
        const targetPhone = args[0]
        if (!targetPhone.match(/^(0|62|8)\d{8,13}$/)) {
            return reply('❌ Format nomor tidak valid!\n\nContoh: .confess 628123456789')
        }
        
        const receiverJid = formatPhone(targetPhone)
        
        // Check if sending to self
        if (receiverJid === senderJid) {
            return reply('❌ Tidak bisa confess ke diri sendiri!')
        }
        
        // Check coins
        console.log('[Confess] Checking coins for:', phoneNumber)
        const user = getUser(phoneNumber)
        console.log('[Confess] User coins:', user.coins)
        
        if (user.coins < 20) {
            return reply(
                `❌ *Koin tidak cukup!*\n\n` +
                `Dibutuhkan: 20 coins\n` +
                `Koin kamu: ${user.coins} coins\n\n` +
                `💡 Main game untuk dapat koin`
            )
        }
        
        try {
            // Generate confess ID
            const confessId = generateConfessId()
            
            // Deduct coins
            addCoins(phoneNumber, -20, 'confess', 'Start confess session')
            
            // Create session
            createSession(confessId, senderJid, receiverJid)
            
            // Download image
            const imageResponse = await axios.get('https://i.pinimg.com/736x/d0/e4/59/d0e45966f5b1c23a5bdbb7a1b07a709b.jpg', {
                responseType: 'arraybuffer',
                timeout: 10000
            })
            const imageBuffer = Buffer.from(imageResponse.data)
            
            // Send to receiver with image
            await session.client.message.send(receiverJid, {
                type: 'image',
                media: imageBuffer,
                caption: 
                    `━━━━━━━━━━━━━━━━\n` +
                    `💌 *CONFESS ANONIM*\n` +
                    `━━━━━━━━━━━━━━━━\n\n` +
                    `Seseorang ingin memulai confess denganmu!\n\n` +
                    `💡 Balas langsung pesan ini untuk memulai percakapan anonim (GRATIS)\n` +
                    `💡 Ketik .end kapan saja untuk mengakhiri\n\n` +
                    `━━━━━━━━━━━━━━━━\n` +
                    `🔢 ID: #${confessId}\n` +
                    `🕒 ${new Date().toLocaleString('id-ID')}\n` +
                    `━━━━━━━━━━━━━━━━`
            })
            
            // Confirm to sender
            const newCoins = user.coins - 20
            await reply(
                `✅ *Session Confess Dimulai!*\n\n` +
                `🔢 ID: #${confessId}\n` +
                `📱 Target: ${targetPhone}\n` +
                `💰 Biaya: 20 coins\n` +
                `💵 Sisa: ${newCoins} coins\n\n` +
                `💬 Kirim pesan langsung (tanpa command) untuk memulai chat\n` +
                `💡 Setiap pesan kamu = 20 coins\n` +
                `💡 Balasan dari dia = GRATIS\n\n` +
                `Ketik .end untuk mengakhiri`
            )
            
        } catch (error) {
            console.error('Confess error:', error)
            return reply(`❌ ${error.message}`)
        }
    }
}
