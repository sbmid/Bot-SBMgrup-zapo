export default {
    name: 'ping',
    description: 'Check bot response time',
    category: 'general',
    
    async execute(ctx) {
        const { reply } = ctx
        const start = Date.now()
        
        const latency = Date.now() - start
        
        await ctx.send(`*[+] Response Time*\n- Latency: ${latency}ms`)
    }
}
