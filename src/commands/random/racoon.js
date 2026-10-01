import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'racoon',
    category: 'random',
    description: 'Get random racoon image',
    aliases: ['raccoon'],
    
    async execute(ctx) {
        try {
            const imageBuffer = await fetchRandomImage('alyachan', 'racoon')
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer
            }, { quote: { key: ctx.event.key, message: ctx.event.message } })
        } catch (error) {
            return ctx.reply(`❌ ${error.message}`)
        }
    }
}
