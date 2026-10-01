import { isOwner } from '../../utils/helpers.js'

export default {
    name: 'endcall',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, session, senderJid, event, args } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        if (!session.client.voip) {
            return await send('*[!]* VoIP not available')
        }
        
        try {
            // Get all active calls
            const calls = session.client.voip.getCalls()
            
            if (calls.length === 0) {
                return await send('*[+]* No active calls')
            }
            
            // If Call ID provided, end specific call
            if (args[0]) {
                const partialCallId = args[0].toLowerCase()
                
                // Find call by partial ID match
                const targetCall = calls.find(call => 
                    call.callId.toLowerCase().includes(partialCallId) && !call.isEnded
                )
                
                if (!targetCall) {
                    const activeIds = calls
                        .filter(c => !c.isEnded)
                        .map(c => c.callId.substring(0, 8))
                        .join(', ')
                    
                    return await send(
                        `*[!]* Call ID not found or already ended\n\n` +
                        `Active IDs: ${activeIds || 'None'}`
                    )
                }
                
                await session.client.voip.endCall(targetCall.callId)
                
                const peerNumber = targetCall.peerJid.split('@')[0]
                return await send(
                    `*[+] Call Ended*\n\n` +
                    `📞 ID: ${targetCall.callId.substring(0, 8)}\n` +
                    `📱 Nomor: +${peerNumber}`
                )
            }
            
            // No ID provided - end ALL calls
            let endedCount = 0
            
            for (const call of calls) {
                if (!call.isEnded) {
                    await session.client.voip.endCall(call.callId)
                    endedCount++
                }
            }
            
            if (endedCount === 0) {
                await send('*[+]* All calls already ended')
            } else {
                await send(`*[+]* Ended ${endedCount} call${endedCount > 1 ? 's' : ''}`)
            }
            
        } catch (error) {
            console.error('End call error:', error.message)
            await send(`*[!]* Failed: ${error.message}`)
        }
    }
}
