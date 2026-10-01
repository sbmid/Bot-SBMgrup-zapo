import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'
import { getDownloadableMedia } from '../../utils/messageHelpers.js'

const MENU_IMAGE_PATH = './data/menu-image.jpg'

export default {
    name: 'setmenu',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, event, args, session } = ctx
        
        try {
            if (args[0] === 'remove' || args[0] === 'delete') {
                // Remove menu image
                try {
                    await fs.unlink(MENU_IMAGE_PATH)
                    await send('*[+]* Menu image removed. Menu will show text only.')
                } catch (err) {
                    await send('*[!]* No menu image set')
                }
                return
            }
            
            if (args[0] === 'check' || args[0] === 'status') {
                // Check current menu image
                try {
                    await fs.access(MENU_IMAGE_PATH)
                    await send('*[+]* Menu image is set\n\nUse `.setmenu remove` to delete')
                } catch (err) {
                    await send('*[+]* No menu image set\n\nUsage:\n- Reply to image: .setmenu\n- From URL: .setmenu <url>')
                }
                return
            }
            
            let imageBuffer
            const url = args[0]
            
            // Check if reply to image
            const media = getDownloadableMedia(event, 'image')
            
            if (media) {
                // Download from quoted/replied image
                await send('*[+]* Downloading image...')
                
                const bytes = await session.client.message.downloadBytes(media.message)
                imageBuffer = Buffer.from(bytes)
                
            } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                // Download from URL
                await send('*[+]* Downloading from URL...')
                
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                })
                
                imageBuffer = Buffer.from(response.data)
                
            } else {
                return await send(
                    '*[+] Set Menu Image*\n\n' +
                    'Usage:\n' +
                    '1. Reply to image: .setmenu\n' +
                    '2. From URL: .setmenu <image_url>\n' +
                    '3. Remove: .setmenu remove\n' +
                    '4. Check: .setmenu check\n\n' +
                    '*Note:* Menu will show image + text'
                )
            }
            
            if (!imageBuffer || imageBuffer.length === 0) {
                return await send('*[!]* Failed to download image')
            }
            
            // Ensure data directory exists
            await fs.mkdir('./data', { recursive: true })
            
            // Save image
            await fs.writeFile(MENU_IMAGE_PATH, imageBuffer)
            
            await send(
                '*[+] Menu Image Set!*\n\n' +
                'Menu will now show:\n' +
                '- Image (this one)\n' +
                '- Command list text\n\n' +
                'Test with: .menu'
            )
            
        } catch (error) {
            console.error('Setmenu error:', error)
            
            let errorMsg = '*[!]* Failed to set menu image\n\n'
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                errorMsg += 'Download timeout'
            } else if (error.response?.status) {
                errorMsg += `HTTP ${error.response.status}`
            } else {
                errorMsg += error.message
            }
            
            await send(errorMsg)
        }
    }
}