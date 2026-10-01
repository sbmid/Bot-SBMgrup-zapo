import { isOwner } from '../../utils/helpers.js'
import { getPhoneNumberFromLid } from '../../database/contacts.js'

export default {
    name: 'listcalls',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, session, senderJid, event } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        if (!session.client.voip) {
            return await send('*[!]* VoIP not available')
        }
        
        try {
            const calls = session.client.voip.getCalls()
            
            if (calls.length === 0) {
                return await send('*[+]* No calls (active or recent)')
            }
            
            let message = '*[+] Calls List*\n\n'
            
            for (const call of calls) {
                const state = call.stateData.state
                const direction = call.direction
                const duration = call.stateData.durationSecs || 0
                const isActive = call.isActive
                const emoji = isActive ? '📞' : (call.isEnded ? '❌' : '⏳')
                
                // Resolve phone number from LID if available
                let phoneNumber = call.peerJid.split('@')[0]
                
                // Check if peerJid is LID format
                if (call.peerJid.includes('@lid')) {
                    const pnJid = getPhoneNumberFromLid(call.peerJid)
                    if (pnJid) {
                        phoneNumber = pnJid.split('@')[0]
                    }
                }
                
                message += `${emoji} *${call.callId.substring(0, 8)}*\n`
                message += `📱 Nomor: +${phoneNumber}\n`
                message += `${direction === 'incoming' ? '📥' : '📤'} Arah: ${direction}\n`
                message += `📊 Status: ${state}\n`
                
                if (duration > 0) {
                    const mins = Math.floor(duration / 60)
                    const secs = duration % 60
                    message += `⏱️ Durasi: ${mins}m ${secs}s\n`
                }
                
                if (call.isEnded && call.stateData.endReason) {
                    message += `🔚 Alasan: ${call.stateData.endReason}\n`
                }
                
                message += '\n'
            }
            
            await send(message.trim())
            
        } catch (error) {
            console.error('List calls error:', error.message)
            await send(`*[!]* Failed: ${error.message}`)
        }
    }
}
