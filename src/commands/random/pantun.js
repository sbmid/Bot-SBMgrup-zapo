import axios from 'axios'

export default {
    name: 'pantun',
    category: 'random',
    description: 'Get random pantun',
    
    async execute(ctx) {
        const { reply } = ctx
        
        try {
            const apiKey = process.env.ALYACHAN_API_KEY
            if (!apiKey) {
                return reply('❌ ALYACHAN_API_KEY not configured')
            }
            
            const response = await axios.get('https://api.alyachan.dev/api/random/pantun', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 30000
            })
            
            if (!response.data?.status || !response.data?.data) {
                return reply('❌ Invalid response from API')
            }
            
            const { author, source, theme, text } = response.data.data
            
            const message = `*📜 PANTUN*\n\n${text}\n\n` +
                          `Tema: ${theme}\n` +
                          `Penulis: ${author}\n` +
                          `Sumber: ${source}`
            
            return reply(message)
        } catch (error) {
            console.error('Pantun error:', error)
            return reply(`❌ ${error.message}`)
        }
    }
}
