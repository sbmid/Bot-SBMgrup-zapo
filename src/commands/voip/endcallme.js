import { getPhoneNumberFromLid } from '../../database/contacts.js'

export default {
    name: 'endcallme',
    category: 'general',
    aliases: ['hangup', 'tutuptelpon'],
    
    async execute(ctx) {
        const { send, session, senderJid, event } = ctx
        
        if (!session.client.voip) {
            return await send('*[!]* VoIP not available')
        }
        
        try {
            const calls = session.client.voip.getCalls()
            
            // Get sender's phone number from LID mapping
            const senderPnJid = event.key?.participantAlt || senderJid
            const senderPhone = senderPnJid.split('@')[0]
            
            // Find active call from this user
            let userCall = null
            
            for (const call of calls) {
                if (call.isEnded) continue
                
                // Resolve phone number
                let phoneNumber = call.peerJid.split('@')[0]
                if (call.peerJid.includes('@lid')) {
                    const pnJid = getPhoneNumberFromLid(call.peerJid)
                    if (pnJid) phoneNumber = pnJid.split('@')[0]
                }
                
                // Match with sender
                if (phoneNumber === senderPhone) {
                    userCall = call
                    break
                }
            }
            
            if (!userCall) {
                return await send(
                    '*[!]* Tidak ada panggilan aktif\n\n' +
                    'Kamu belum menelepon bot atau panggilan sudah berakhir.'
                )
            }
            
            // End the call
            await session.client.voip.endCall(userCall.callId)
            
            // Calculate duration if connected
            let durationText = ''
            if (userCall.stateData.connectedAt) {
                const startTime = new Date(userCall.stateData.connectedAt)
                const now = new Date()
                const durationMs = now - startTime
                const mins = Math.floor(durationMs / 60000)
                const secs = Math.floor((durationMs % 60000) / 1000)
                durationText = `\n⏱️ Durasi: ${mins}m ${secs}s`
            }
            
            await send(
                `*[+] Panggilan Diakhiri*\n\n` +
                `- ID: ${userCall.callId.substring(0, 8)}\n` +
                `- Nomor: +${senderPhone}` +
                durationText
            )
            
        } catch (error) {
            console.error('End call me error:', error.message)
            await send(`*[!]* Failed: ${error.message}`)
        }
    }
}
