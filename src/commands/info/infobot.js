import os from 'os'

export default {
    name: 'infobot',
    category: 'info',
    description: 'Show bot information',
    usage: 'infobot',
    aliases: ['botinfo', 'about'],
    
    async execute(ctx) {
        const { reply } = ctx
        
        // Get system info
        const uptime = process.uptime()
        const uptimeHours = Math.floor(uptime / 3600)
        const uptimeMinutes = Math.floor((uptime % 3600) / 60)
        const uptimeSeconds = Math.floor(uptime % 60)
        
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
        const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2)
        const usedMem = (totalMem - freeMem).toFixed(2)
        
        const nodeVersion = process.version
        const platform = process.platform
        
        const info = `*[+] SBMgrup BOT INFORMATION*

*ABOUT BOT*
SBMgrup Bot adalah WhatsApp bot multi-session yang dirancang untuk membantu pengelolaan grup dan menyediakan berbagai fitur menarik seperti AI, games, tools, sticker maker, dan masih banyak lagi.

Bot ini menggunakan teknologi modern dan arsitektur modular untuk memastikan performa yang optimal dan mudah dikembangkan.

*TECHNOLOGY STACK*
• Runtime: Node.js ${nodeVersion}
• Library: Zapo-JS (WhatsApp Multi-Device)
• Database: SQLite3 (Better-SQLite3)
• Web Framework: Express.js
• Image Processing: Sharp
• AI Integration: Multiple AI APIs
• Platform: ${platform === 'linux' ? 'Linux' : platform === 'win32' ? 'Windows' : 'Other'}

*KEY FEATURES*
• Multi-Session Support
• Webhook Integration
• RESTful API Endpoints
• AI Chat & Image Generation
• Game System with Coins
• Sticker Maker & Tools
• Image/Video Processing
• Music Player
• Group Management
• Confess System
• VOIP Call Detection
• Web Dashboard

*API ENDPOINTS*
• Session Management
• Send Messages & Media
• Group Operations
• Profile Management
• VoIP Call Control
• Webhook Configuration

*SYSTEM STATUS*
• Uptime: ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s
• Memory: ${usedMem}GB / ${totalMem}GB
• Free: ${freeMem}GB

*DEVELOPER*
• Name: Azrial Galih P.
• Age: 19 years old
• Role: Full Stack Developer
• Project: SBMgrup Bot

*VERSION*
• Bot: v1.0.0
• Last Update: 2025

*LINKS*
• GitHub: [Coming Soon]
• Support Group: [Ask Owner]
• Documentation: Type .menu

*SPECIAL THANKS TO*
• Zapo-JS Team
• All Contributors
• SBMgrup Community

_Bot ini dikembangkan dengan dedikasi untuk memberikan pengalaman terbaik dalam pengelolaan grup WhatsApp._`

        await reply(info)
    }
}
