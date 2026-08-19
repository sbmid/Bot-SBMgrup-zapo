export default {
    name: 'listcalls',
    category: 'general',
    
    async execute(ctx) {
        const { send, session } = ctx
        
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
                const peer = call.peerJid.split('@')[0]
                const state = call.stateData.state
                const direction = call.direction
                const duration = call.stateData.durationSecs || 0
                
                message += `*Call:* ${call.callId.substring(0, 8)}...\n`
                message += `- Peer: +${peer}\n`
                message += `- Direction: ${direction}\n`
                message += `- State: ${state}\n`
                
                if (duration > 0) {
                    message += `- Duration: ${duration}s\n`
                }
                
                if (call.isEnded && call.stateData.endReason) {
                    message += `- End Reason: ${call.stateData.endReason}\n`
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
