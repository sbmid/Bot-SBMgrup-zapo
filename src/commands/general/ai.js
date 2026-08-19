import axios from 'axios'

export default {
    name: 'ai',
    category: 'general',
    
    async execute(ctx) {
        const { send, reply, args } = ctx
        
        if (args.length === 0) {
            return await send('*[!]* Usage: ai <question>\n\nExample: ai what is javascript?')
        }
        
        const question = args.join(' ')
        
        await reply('*[+] Processing...*\n\nGetting AI response...')
        
        try {
            // Using free AI API (you can replace with OpenAI/Gemini)
            const response = await axios.post('https://api.siputzx.my.id/api/ai/chatgpt', {
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful WhatsApp bot assistant. Keep responses concise and formatted for WhatsApp (use *bold*, _italic_, ~strikethrough~). No markdown code blocks.'
                    },
                    {
                        role: 'user',
                        content: question
                    }
                ]
            }, {
                timeout: 30000
            })
            
            if (response.data?.status && response.data?.data) {
                const aiResponse = response.data.data
                
                // Format response
                await send(
                    `*[+] AI Response*\n\n${aiResponse}\n\n` +
                    `_Question: ${question.substring(0, 50)}${question.length > 50 ? '...' : ''}_`
                )
            } else {
                await send('*[!]* No response from AI')
            }
            
        } catch (error) {
            console.error('AI error:', error.message)
            
            if (error.code === 'ECONNABORTED') {
                await send('*[!]* Request timeout - AI service took too long')
            } else if (error.response) {
                await send(`*[!]* AI API Error: ${error.response.status}`)
            } else {
                await send(`*[!]* Failed: ${error.message}`)
            }
        }
    }
}
