import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'mediafire',
    category: 'downloader',
    aliases: ['mf', 'mfire'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const url = args[0]
        
        if (!url) {
            return await send(
                '*[+] MediaFire Downloader*\n\n' +
                'Usage: .mediafire <url>\n' +
                'Alias: .mf / .mfire\n\n' +
                'Example:\n.mf https://www.mediafire.com/file/abc123/file.apk'
            )
        }
        
        if (!url.includes('mediafire.com')) {
            return await send('*[!]* Invalid MediaFire URL')
        }
        
        await send('*[~]* Downloading from MediaFire...\n\nPlease wait...')
        
        try {
            const response = await axios.get(`https://api.alyachan.dev/api/downloader/mediafire?url=${encodeURIComponent(url)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status) {
                return await send('*[!]* Failed to fetch MediaFire file')
            }
            
            const data = response.data.data
            
            let caption = '*[+] MediaFire File*\n\n'
            caption += `*Filename:* ${data.filename}\n`
            caption += `*Size:* ${data.size}\n\n`
            caption += 'Downloaded by SBMgrup Bot'
            
            await send(caption)
            
            // Send as document
            await ctx.session.client.message.send(ctx.chatJid, {
                documentMessage: {
                    url: data.url,
                    fileName: data.filename,
                    mimetype: 'application/octet-stream'
                }
            })
            
        } catch (error) {
            console.error('MediaFire download error:', error)
            
            let errorMsg = '*[!]* Download failed\n\n'
            if (error.response?.status === 503) {
                errorMsg += 'API service unavailable. Try again later.'
            } else if (error.response?.status === 401) {
                errorMsg += 'API key invalid'
            } else {
                errorMsg += error.message
            }
            
            await send(errorMsg)
        }
    }
}
