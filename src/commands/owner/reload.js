import { isOwner } from '../../utils/helpers.js'

export default {
    name: 'reload',
    aliases: ['reloadcmd', 'rcmd'],
    category: 'owner',
    ownerOnly: true,
    description: 'Reload all commands in memory without restarting bot',

    async execute(ctx) {
        const { send, senderJid, event, session } = ctx

        // Owner check
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }

        await send('🔄 *Reloading commands...*')

        try {
            const commandHandler = session.commandHandler
            const result = await commandHandler.loadCommands()

            await send(`✅ *Commands Reloaded Successfully!*\n\n` +
                       `📦 Total Commands: ${result.totalCommands}\n` +
                       `📁 Categories: ${result.totalCategories}`)
        } catch (error) {
            await send(`❌ *Failed to reload commands:* ${error.message}`)
        }
    }
}
