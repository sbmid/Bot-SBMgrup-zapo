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
        
        // React loading
        try {
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'reaction',
                emoji: '⏳',
                target: ctx.event
            })
        } catch (e) {}
        
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
            
            // Download file from URL first
            const fileResponse = await axios.get(data.url, {
                responseType: 'arraybuffer'
            })
            const fileBuffer = Buffer.from(fileResponse.data)
            
            // Caption
            let caption = `*[+] MediaFire Download*\n\n`
            caption += `*File:* ${data.filename}\n`
            if (data.size) {
                caption += `*Size:* ${data.size}\n`
            }
            if (data.uploaded) {
                caption += `*Uploaded:* ${data.uploaded}\n`
            }
            caption += `Downloaded by SBMgrup Bot`
            
            // Send as document with caption
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'document',
                media: fileBuffer,
                fileName: data.filename,
                mimetype: 'application/octet-stream',
                caption: caption
            })
            
            // React success
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '✅',
                    target: ctx.event
                })
            } catch (e) {}
            
        } catch (error) {
            console.error('MediaFire download error:', error)
            
            // React error
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '❌',
                    target: ctx.event
                })
            } catch (e) {}
            
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
