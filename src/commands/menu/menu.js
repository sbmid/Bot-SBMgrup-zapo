export default {
    name: 'menu',
    description: 'Show command menu',
    category: 'menu',
    
    async execute(ctx) {
        const { session, reply } = ctx
        
        // Get menu from command handler
        const commandHandler = session.commandHandler
        const menuText = commandHandler.getMenu()
        
        await reply(menuText)
    }
}
