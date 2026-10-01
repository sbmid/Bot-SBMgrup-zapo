import { setAntilink, getGroupSettings } from '../../database/groupSettings.js'

export default {
    name: 'antilink',
    description: 'Toggle antilink (delete messages with group links) - admin only',
    category: 'group',
    groupOnly: true,
    adminOnly: true,
    usage: '.antilink on/off',
    
    async execute(ctx) {
        const { reply, chatJid, args } = ctx
        
        if (!args[0]) {
            const settings = getGroupSettings(chatJid)
            return reply(`Antilink is currently: ${settings.antilink ? 'ON' : 'OFF'}\n\nUsage: .antilink on/off`)
        }
        
        const action = args[0].toLowerCase()
        
        if (action !== 'on' && action !== 'off') {
            return reply('Usage: .antilink on/off')
        }
        
        const enabled = action === 'on'
        setAntilink(chatJid, enabled)
        
        return reply(`✅ Antilink ${enabled ? 'enabled' : 'disabled'}\n\nMessages with group links will ${enabled ? 'be deleted automatically' : 'not be filtered'}.`)
    }
}
