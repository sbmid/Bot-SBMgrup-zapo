import { getPhoneNumberFromLid } from '../../database/contacts.js'

export default {
    name: 'cekcall',
    category: 'general',
    aliases: ['checkcall', 'callinfo'],
    
    async execute(ctx) {
        const { send, session, senderJid, event } = ctx
        
        if (!session.client.voip) {
            return await send('*[!]* VoIP not available')
        }
        
        try {
            const calls = session.client.voip.getCalls()
            
            // Filter only active/connecting calls
            const activeCalls = calls.filter(c => !c.isEnded)
            
            if (activeCalls.length === 0) {
                return await send('*[+]* No active calls')
            }
            
            // Get sender's phone number from LID mapping
            const senderPnJid = event.key?.participantAlt || senderJid
            const senderPhone = senderPnJid.split('@')[0]
            
            let message = '*[+] Active Calls*\n\n'
            
            for (const call of activeCalls) {
                // Resolve phone number
                let phoneNumber = call.peerJid.split('@')[0]
                if (call.peerJid.includes('@lid')) {
                    const pnJid = getPhoneNumberFromLid(call.peerJid)
                    if (pnJid) phoneNumber = pnJid.split('@')[0]
                }
                
                // Highlight user's own call
                const isUserCall = phoneNumber === senderPhone
                const marker = isUserCall ? '- *YOUR CALL*' : ''
                
                const state = call.stateData.state
                const direction = call.direction
                const connectedAt = call.stateData.connectedAt
                const emoji = call.isActive ? '[+]' : '⏳'
                
                message += `${emoji} *${call.callId.substring(0, 8)}* ${marker}\n`
                message += `[+] Nomor: +${phoneNumber}\n`
                message += `${direction === 'incoming' ? '[+]' : '[+]'} Arah: ${direction}\n`
                message += `[+] Status: ${state}\n`
                
                if (connectedAt) {
                    const startTime = new Date(connectedAt)
                    const now = new Date()
                    const elapsedMs = now - startTime
                    const elapsedMin = Math.floor(elapsedMs / 60000)
                    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000)
                    
                    // 30 minutes limit
                    const maxDurationMs = 30 * 60 * 1000
                    const remainingMs = maxDurationMs - elapsedMs
                    const remainingMin = Math.max(0, Math.floor(remainingMs / 60000))
                    const remainingSec = Math.max(0, Math.floor((remainingMs % 60000) / 1000))
                    
                    message += `[+] Durasi: ${elapsedMin}m ${elapsedSec}s\n`
                    message += `[+] Mulai: ${startTime.toLocaleTimeString('id-ID')}\n`
                    
                    if (remainingMs > 0) {
                        message += `[+] Sisa: ${remainingMin}m ${remainingSec}s\n`
                        const endTime = new Date(startTime.getTime() + maxDurationMs)
                        message += `[+] Auto-end: ${endTime.toLocaleTimeString('id-ID')}\n`
                    } else {
                        message += `⚠️ Melebihi batas waktu!\n`
                    }
                }
                
                message += '\n'
            }
            
            const totalSlots = 10
            const usedSlots = activeCalls.length
            message += `[+] Slot: ${usedSlots}/${totalSlots} terpakai`
            
            await send(message.trim())
            
        } catch (error) {
            console.error('Check call error:', error.message)
            await send(`*[!]* Failed: ${error.message}`)
        }
    }
}
