import fs from 'fs/promises'

const GROUP_URL_PATH = './data/group-url.txt'

export default {
    name: 'setgroupurl',
    aliases: ['seturl'],
    description: 'Set bot group URL for menu button',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { args, reply } = ctx
        
        // Check current URL
        if (args[0] === 'check') {
            try {
                const currentUrl = await fs.readFile(GROUP_URL_PATH, 'utf8')
                return reply(`Current group URL:\n${currentUrl.trim()}`)
            } catch (err) {
                return reply('No group URL set')
            }
        }
        
        // Remove URL
        if (args[0] === 'remove' || args[0] === 'delete') {
            try {
                await fs.unlink(GROUP_URL_PATH)
                return reply('✅ Group URL removed. Menu button will not appear.')
            } catch (err) {
                return reply('No group URL to remove')
            }
        }
        
        if (args.length === 0) {
            return reply('Usage:\n.setgroupurl <url> - Set URL\n.setgroupurl check - Check current URL\n.setgroupurl remove - Remove URL\n\nExample:\n.setgroupurl https://chat.whatsapp.com/abc123')
        }
        
        const url = args.join(' ').trim()
        
        // Basic URL validation
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return reply('❌ Invalid URL format. Must start with http:// or https://')
        }
        
        try {
            // Create data directory if not exists
            await fs.mkdir('./data', { recursive: true })
            
            // Save URL
            await fs.writeFile(GROUP_URL_PATH, url, 'utf8')
            
            await reply(`✅ Group URL set!\n\n${url}\n\nMenu will show "Join Group" button.`)
            
        } catch (err) {
            console.error('[SETGROUPURL] Error:', err)
            await reply('❌ Failed to save group URL')
        }
    }
}
