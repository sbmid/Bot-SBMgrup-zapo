import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'bluearchive',
    category: 'random',
    description: 'Get random Blue Archive character image',
    aliases: ['ba'],
    
    async execute(ctx) {
        try {
            const imageBuffer = await fetchRandomImage('siputzx', 'blue-archive')
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer
            }, { quote: { key: ctx.event.key, message: ctx.event.message } })
        } catch (error) {
            return ctx.reply(`❌ ${error.message}`)
        }
    }
}
