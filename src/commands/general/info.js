export default {
    name: 'info',
    description: 'Show bot information',
    category: 'general',
    
    async execute(ctx) {
        const { send, session } = ctx
        
        const info = `*[+] Bot Information*

- Name: SBMgrup Bot
- Session: ${session.id}
- Status: ${session.status}
- Uptime: ${Math.floor(process.uptime())}s
- Commands: ${session.commandHandler.commands.size}

*[+] System*
- Platform: ${process.platform}
- Node: ${process.version}
- Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`

        await send(info)
    }
}
