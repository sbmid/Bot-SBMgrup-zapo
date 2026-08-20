import { getRealJid, isOwner } from '../../utils/helpers.js'

export default {
    name: 'callme',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, session, event, reply, senderJid } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        if (!session.client.voip) {
            return await send('*[!]* VoIP not available')
        }
        
        // Get caller number from participantAlt or remoteJidAlt
        const realJid = getRealJid(event)
        
        if (!realJid || realJid.includes('@lid')) {
            return await send('*[!]* Cannot determine your phone number')
        }
        
        const phoneNumber = realJid.split('@')[0].replace(/\D/g, '')
        
        try {
            await reply('*[+] Calling you...*')
            
            // Use CORRECT format with peerJid object
            const callId = await session.client.voip.startCall({
                peerJid: realJid,
                isVideo: false
            })
            
            await send(`*[+] Call Started*\n- Call ID: ${callId}\n- To: +${phoneNumber}`)
            
        } catch (error) {
            console.error('Call error:', error.message)
            if (error.stack) console.error('Stack:', error.stack)
            await send(`*[!]* Failed: ${error.message}`)
        }
    }
}
