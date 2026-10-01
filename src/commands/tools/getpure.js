import axios from 'axios'
import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { promisify } from 'util'
import { proto } from 'zapo-js'

const BASE_URL = process.env.BASE_URL2 || 'http://localhost:3001'

// Smart compression formula: Target = Original × (WA_Limit / Original)^0.7
function calculateSmartCompression(fileSize) {
    const WA_LIMIT_IMAGE = 16 * 1024 * 1024  // 16MB
    const WA_LIMIT_VIDEO = 16 * 1024 * 1024  // 16MB for status
    
    // No compression if under 16MB
    if (fileSize < WA_LIMIT_IMAGE) {
        return null // Original
    }
    
    // Calculate target using formula
    const ratio = Math.pow(WA_LIMIT_IMAGE / fileSize, 0.7)
    const targetSize = Math.round(fileSize * ratio)
    
    // Determine quality based on size
    if (fileSize < 50 * 1024 * 1024) {
        return { quality: 70, targetSize }
    } else {
        return { quality: 50, targetSize }
    }
}

// Compress image with watermark
async function compressImage(inputPath, outputPath, mode) {
    return new Promise((resolve, reject) => {
        const stats = fs.statSync(inputPath)
        const originalSize = stats.size
        const logoPath = path.join(process.cwd(), 'assets', 'watermark.png')
        const hasLogo = fs.existsSync(logoPath)
        
        // Mode 2: Original (no compression)
        if (mode === 2) {
            // Add watermark even for original mode
            addWatermarkImage(inputPath, outputPath)
                .then(() => {
                    const finalSize = fs.statSync(outputPath).size
                    resolve({ compressed: false, originalSize, finalSize })
                })
                .catch(reject)
            return
        }
        
        let quality = 100
        
        // Mode 1: 80% compression
        if (mode === 1) {
            quality = 80
        }
        
        // Mode 3: Smart compression
        if (mode === 3) {
            const smart = calculateSmartCompression(originalSize)
            if (!smart) {
                addWatermarkImage(inputPath, outputPath)
                    .then(() => {
                        const finalSize = fs.statSync(outputPath).size
                        resolve({ compressed: false, originalSize, finalSize })
                    })
                    .catch(reject)
                return
            }
            quality = smart.quality
        }
        
        // Compress + watermark
        if (hasLogo) {
            // Logo + 2 lines text watermark (TOP-RIGHT, larger)
            ffmpeg(inputPath)
                .input(logoPath)
                .outputOptions([
                    `-q:v ${Math.round((100 - quality) / 10)}`
                ])
                .complexFilter([
                    '[1:v]scale=120:120[logo]',
                    '[0:v][logo]overlay=W-w-10:10[wm1]',
                    "[wm1]drawtext=text='Status HD':x=W-tw-10:y=140:fontsize=26:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2[wm2]",
                    "[wm2]drawtext=text='www.sbmku.sbs':x=W-tw-10:y=170:fontsize=22:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2"
                ])
                .output(outputPath)
                .on('end', () => {
                    const finalSize = fs.statSync(outputPath).size
                    resolve({ compressed: true, originalSize, finalSize, quality })
                })
                .on('error', reject)
                .run()
        } else {
            // Text only fallback (2 lines, top-right)
            ffmpeg(inputPath)
                .outputOptions([
                    `-q:v ${Math.round((100 - quality) / 10)}`
                ])
                .videoFilters([
                    "drawtext=text='Status HD':x=W-tw-10:y=10:fontsize=32:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='www.sbmku.sbs':x=W-tw-10:y=50:fontsize=26:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2"
                ])
                .output(outputPath)
                .on('end', () => {
                    const finalSize = fs.statSync(outputPath).size
                    resolve({ compressed: true, originalSize, finalSize, quality })
                })
                .on('error', reject)
                .run()
        }
    })
}

// Add watermark to image (for original mode)
async function addWatermarkImage(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const logoPath = path.join(process.cwd(), 'assets', 'watermark.png')
        
        // Check if logo exists
        if (fs.existsSync(logoPath)) {
            // Logo + 2 lines text watermark (TOP-RIGHT, larger)
            ffmpeg(inputPath)
                .input(logoPath)
                .complexFilter([
                    // Overlay logo at top-right (10px margin), larger size
                    '[1:v]scale=120:120[logo]',
                    '[0:v][logo]overlay=W-w-10:10[wm1]',
                    // Add text line 1: "Status HD" (below logo)
                    "[wm1]drawtext=text='Status HD':x=W-tw-10:y=140:fontsize=26:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2[wm2]",
                    // Add text line 2: "www.sbmku.sbs" (below line 1)
                    "[wm2]drawtext=text='www.sbmku.sbs':x=W-tw-10:y=170:fontsize=22:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2"
                ])
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run()
        } else {
            // Text only fallback (2 lines, top-right)
            ffmpeg(inputPath)
                .videoFilters([
                    "drawtext=text='Status HD':x=W-tw-10:y=10:fontsize=32:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='www.sbmku.sbs':x=W-tw-10:y=50:fontsize=26:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2"
                ])
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run()
        }
    })
}

// Compress video with watermark
async function compressVideo(inputPath, outputPath, mode) {
    return new Promise((resolve, reject) => {
        const stats = fs.statSync(inputPath)
        const originalSize = stats.size
        const logoPath = path.join(process.cwd(), 'assets', 'watermark.png')
        const hasLogo = fs.existsSync(logoPath)
        
        // Mode 2: Original (no compression, just watermark)
        if (mode === 2) {
            const filters = hasLogo 
                ? [
                    'movie=' + logoPath + '[logo]',
                    '[logo]scale=120:120[logo_scaled]',
                    '[in][logo_scaled]overlay=W-w-10:10[wm1]',
                    "[wm1]drawtext=text='Status HD':x=W-tw-10:y=140:fontsize=28:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2[wm2]",
                    "[wm2]drawtext=text='www.sbmku.sbs':x=W-tw-10:y=170:fontsize=24:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2[out]"
                ].join(',')
                : "drawtext=text='Status HD':x=W-tw-10:y=10:fontsize=36:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='www.sbmku.sbs':x=W-tw-10:y=55:fontsize=30:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2"
            
            ffmpeg(inputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-crf 23',
                    '-preset fast',
                    '-movflags +faststart'
                ])
                .videoFilters(filters)
                .output(outputPath)
                .on('end', () => {
                    const finalSize = fs.statSync(outputPath).size
                    resolve({ compressed: false, originalSize, finalSize })
                })
                .on('error', reject)
                .run()
            return
        }
        
        let crf = 23 // Default (balanced)
        
        // Mode 1: 80% compression (higher CRF = more compression)
        if (mode === 1) {
            crf = 28 // More compression
        }
        
        // Mode 3: Smart compression
        if (mode === 3) {
            const smart = calculateSmartCompression(originalSize)
            if (!smart) {
                const filters = hasLogo 
                    ? [
                        'movie=' + logoPath + '[logo]',
                        '[logo]scale=120:120[logo_scaled]',
                        '[in][logo_scaled]overlay=W-w-10:10[wm1]',
                        "[wm1]drawtext=text='Status HD':x=W-tw-10:y=140:fontsize=28:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2[wm2]",
                        "[wm2]drawtext=text='www.sbmku.sbs':x=W-tw-10:y=170:fontsize=24:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2[out]"
                    ].join(',')
                    : "drawtext=text='Status HD':x=W-tw-10:y=10:fontsize=36:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='www.sbmku.sbs':x=W-tw-10:y=55:fontsize=30:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2"
                
                ffmpeg(inputPath)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions([
                        '-crf 23',
                        '-preset fast',
                        '-movflags +faststart'
                    ])
                    .videoFilters(filters)
                    .output(outputPath)
                    .on('end', () => {
                        const finalSize = fs.statSync(outputPath).size
                        resolve({ compressed: false, originalSize, finalSize })
                    })
                    .on('error', reject)
                    .run()
                return
            }
            crf = smart.quality === 70 ? 26 : 30
        }
        
        const filters = hasLogo 
            ? [
                'movie=' + logoPath + '[logo]',
                '[logo]scale=120:120[logo_scaled]',
                '[in][logo_scaled]overlay=W-w-10:10[wm1]',
                "[wm1]drawtext=text='Status HD':x=W-tw-10:y=140:fontsize=28:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2[wm2]",
                "[wm2]drawtext=text='www.sbmku.sbs':x=W-tw-10:y=170:fontsize=24:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2[out]"
            ].join(',')
            : "drawtext=text='Status HD':x=W-tw-10:y=10:fontsize=36:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='www.sbmku.sbs':x=W-tw-10:y=55:fontsize=30:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2"
        
        ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                `-crf ${crf}`,
                '-preset fast',
                '-movflags +faststart'
            ])
            .videoFilters(filters)
            .output(outputPath)
            .on('end', () => {
                const finalSize = fs.statSync(outputPath).size
                resolve({ compressed: true, originalSize, finalSize, crf })
            })
            .on('error', reject)
            .run()
    })
}

export default {
    name: 'getpure',
    category: 'tools',
    aliases: ['pure', 'downloadpure'],
    typing: true,
    
    async execute(ctx) {
        const { send, args, reply, session, chatJid, event } = ctx
        
        // Show usage
        if (args.length === 0) {
            return await send(
                '*[+] PureStatus Downloader*\n\n' +
                'Usage: .getpure <token> [--mode]\n' +
                'Alias: .getpure / .pure\n\n' +
                '*Quick Mode (with flag):*\n' +
                '.getpure TOKEN --1  (80% Compress)\n' +
                '.getpure TOKEN --2  (Original)\n' +
                '.getpure TOKEN --3  (Smart)\n\n' +
                '*How to get token:*\n' +
                '1. Upload HD media: https://www.sbmku.sbs\n' +
                '2. Copy token setelah upload\n' +
                '3. Use: .getpure TOKEN\n\n' +
                '*Compression Modes:*\n' +
                '1. 80% Compress - Fast, small size\n' +
                '2. Original - No compression\n' +
                '3. Smart - Auto optimize for WhatsApp\n\n' +
                '_Upload expires in 1 hour_'
            )
        }
        
        const token = args[0].toUpperCase()
        
        // Check if mode flag provided: --1, --2, --3
        let modeFlag = null
        if (args[1] && args[1].startsWith('--')) {
            const flagNum = parseInt(args[1].replace('--', ''))
            if ([1, 2, 3].includes(flagNum)) {
                modeFlag = flagNum
            }
        }
        
        try {
            // React loading
            try {
                await session.client.message.send(chatJid, {
                    type: 'reaction',
                    emoji: '⏳',
                    target: event
                })
            } catch (e) {}
            
            // Get file info from API
            await send('*[~] Checking token...*')
            
            const apiUrl = `${BASE_URL}/api/file/${token}`
            console.log('[GetPure] Fetching file info from:', apiUrl)
            
            const response = await axios.get(apiUrl, {
                allowAbsoluteUrls: true
            })
            
            if (!response.data.success) {
                return await reply('*[!]* Token not found or expired')
            }
            
            const fileInfo = response.data.data
            const isImage = fileInfo.fileType.startsWith('image')
            const isVideo = fileInfo.fileType.startsWith('video')
            
            let mode
            
            // If flag provided, use it directly
            if (modeFlag) {
                mode = modeFlag
                const modeName = mode === 1 ? '80% Compress' : mode === 2 ? 'Original' : 'Smart'
                await reply(`*[~] Processing with ${modeName} mode*\n\n_Please wait..._`)
            } else {
                // Show file info and send button for mode selection
                let modeMsg = '*[+] File Found!*\n\n'
                modeMsg += 'Choose compression mode:'
                
                // Send button message
                const sentMsg = await session.client.message.send(chatJid, {
                    buttonsMessage: {
                        contentText: modeMsg,
                        footerText: 'Click button to choose mode',
                        headerType: proto.Message.ButtonsMessage.HeaderType.TEXT,
                        text: 'Choose compression mode:',
                        buttons: [
                            {
                                buttonId: `pure_${token}_1`,
                                buttonText: { displayText: '80% Compress' },
                                type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
                            },
                            {
                                buttonId: `pure_${token}_2`,
                                buttonText: { displayText: 'Original' },
                                type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
                            },
                            {
                                buttonId: `pure_${token}_3`,
                                buttonText: { displayText: 'Smart' },
                                type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
                            }
                        ]
                    }
                })
                
                // Wait for button response (30 seconds)
                const modePromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('TIMEOUT'))
                    }, 30000)
                    
                    const listener = async (msg) => {
                        try {
                            // Check for button response
                            const buttonResponse = msg.message?.buttonsResponseMessage
                            if (buttonResponse) {
                                const buttonId = buttonResponse.selectedButtonId
                                
                                // Check if this button belongs to our message
                                if (buttonId && buttonId.startsWith(`pure_${token}_`)) {
                                    const selectedMode = parseInt(buttonId.split('_')[2])
                                    
                                    if ([1, 2, 3].includes(selectedMode)) {
                                        clearTimeout(timeout)
                                        session.client.off('message', listener)
                                        resolve(selectedMode)
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('[GetPure] Listener error:', e)
                        }
                    }
                    
                    session.client.on('message', listener)
                })
                
                try {
                    mode = await modePromise
                } catch (e) {
                    return await reply('*[!]* Timeout. Use .getpure ' + token + ' again or use flag: .getpure ' + token + ' --1')
                }
            }
            
            // Get mode name
            const modeName = mode === 1 ? '80% Compress' : mode === 2 ? 'Original' : 'Smart'
            
            await reply(`*[~] Downloading & Processing*\n\nMode: ${modeName}\n\n_Please wait..._`)
            
            // Download file from cloud URL
            console.log('[GetPure] Downloading from:', fileInfo.url)
            const fileResponse = await axios.get(fileInfo.url, {
                responseType: 'arraybuffer',
                timeout: 300000 // 5 minutes
            })
            
            const tempDir = path.join(process.cwd(), 'temp')
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
            }
            
            const inputPath = path.join(tempDir, `input-${Date.now()}${path.extname(fileInfo.originalName)}`)
            const outputPath = path.join(tempDir, `output-${Date.now()}${path.extname(fileInfo.originalName)}`)
            
            fs.writeFileSync(inputPath, Buffer.from(fileResponse.data))
            
            // Compress based on type
            let result
            if (isImage) {
                result = await compressImage(inputPath, outputPath, mode)
            } else if (isVideo) {
                result = await compressVideo(inputPath, outputPath, mode)
            } else {
                fs.copyFileSync(inputPath, outputPath)
                result = { compressed: false, originalSize: fileInfo.fileSize, finalSize: fileInfo.fileSize }
            }
            
            // Read compressed file
            const finalBuffer = fs.readFileSync(outputPath)
            
            // Calculate compression ratio
            const ratio = ((1 - result.finalSize / result.originalSize) * 100).toFixed(1)
            
            // Send file (no caption - pure media)
            if (isImage) {
                await session.client.message.send(chatJid, {
                    type: 'image',
                    media: finalBuffer,
                    mimetype: fileInfo.fileType
                }, {
                    quote: { key: event.key, message: event.message }
                })
            } else if (isVideo) {
                await session.client.message.send(chatJid, {
                    type: 'video',
                    media: finalBuffer,
                    mimetype: fileInfo.fileType
                }, {
                    quote: { key: event.key, message: event.message }
                })
            }
            
            // React success
            try {
                await session.client.message.send(chatJid, {
                    type: 'reaction',
                    emoji: '✅',
                    target: event
                })
            } catch (e) {}
            
            // Cleanup temp files
            fs.unlinkSync(inputPath)
            fs.unlinkSync(outputPath)
            
            // Mark as downloaded in database (via API)
            try {
                await axios.post(`${BASE_URL}/api/file/${token}/downloaded`, {
                    downloadedBy: ctx.from || chatJid
                })
            } catch (e) {
                console.error('[GetPure] Mark download error:', e.message)
            }
            
        } catch (error) {
            console.error('[GetPure] Error:', error)
            
            try {
                await session.client.message.send(chatJid, {
                    type: 'reaction',
                    emoji: '❌',
                    target: event
                })
            } catch (e) {}
            
            let errorMsg = '*[!]* Download Failed\n\n'
            
            if (error.response?.status === 404) {
                errorMsg += 'Token not found or expired\n\n'
                errorMsg += `Debug: Tried to fetch from ${BASE_URL}/api/file/${token}`
            } else if (error.response?.status === 410) {
                errorMsg += 'Token expired (>1 hour)'
            } else if (error.message === 'TIMEOUT') {
                errorMsg += 'Mode selection timeout\n'
                errorMsg += `Use flag: .getpure ${token} --1`
            } else if (error.code === 'ECONNABORTED') {
                errorMsg += 'Download timeout. File too large.'
            } else {
                errorMsg += error.message
            }
            
            await reply(errorMsg)
        }
    }
}
