import { isOwner } from '../../utils/helpers.js'

export default {
    name: 'endcall',
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
            // Get all active calls
            const calls = session.client.voip.getCalls()
            
            if (calls.length === 0) {
                return await send('*[+]* No active calls')
            }
            
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
