import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'gdrive',
    category: 'downloader',
    aliases: ['drive', 'googledrive'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const url = args[0]
        
        if (!url) {
            return await send(
                '*[+] Google Drive Downloader*\n\n' +
                'Usage: .gdrive <url>\n' +
                'Alias: .drive / .googledrive\n\n' +
                'Example:\n.gdrive https://drive.google.com/file/d/ABC123/view'
            )
        }
        
        if (!url.includes('drive.google.com')) {
            return await send('*[!]* Invalid Google Drive URL')
        }
        
        await send('*[~]* Downloading from Google Drive...\n\nPlease wait...')
        
        try {
            const response = await axios.get(`https://api.alyachan.dev/api/downloader/gdrive?url=${encodeURIComponent(url)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status) {
                return await send('*[!]* Failed to fetch Google Drive file')
            }
            
            const data = response.data.data
            
            let caption = '*[+] Google Drive File*\n\n'
            caption += `*Filename:* ${data.filename}\n`
            caption += `*Size:* ${data.size}\n`
            caption += `*Type:* ${data.mime}\n\n`
            caption += 'Downloaded by SBMgrup Bot'
            
            await send(caption)
            
            // Send as document
            await ctx.session.client.message.send(ctx.chatJid, {
                documentMessage: {
                    url: data.url,
                    fileName: data.filename,
                    mimetype: data.mime
                }
            })
            
        } catch (error) {
            console.error('Google Drive download error:', error)
            
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
