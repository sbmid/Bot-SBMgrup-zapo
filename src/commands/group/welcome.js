import { setWelcome, getGroupSettings } from '../../database/groupSettings.js'

export default {
    name: 'welcome',
    description: 'Toggle welcome message for new members - admin only',
    category: 'group',
    groupOnly: true,
    adminOnly: true,
    usage: '.welcome on/off',
    
    async execute(ctx) {
        const { reply, chatJid, args } = ctx
        
        if (!args[0]) {
            const settings = getGroupSettings(chatJid)
            return reply(`Welcome message is currently: ${settings.welcome ? 'ON' : 'OFF'}\n\nUsage: .welcome on/off`)
        }
        
        const action = args[0].toLowerCase()
        
        if (action !== 'on' && action !== 'off') {
            return reply('Usage: .welcome on/off')
        }
        
        const enabled = action === 'on'
        setWelcome(chatJid, enabled)
        
        return reply(`✅ Welcome message ${enabled ? 'enabled' : 'disabled'}\n\nNew members will ${enabled ? 'receive' : 'not receive'} a welcome image.`)
    }
}
