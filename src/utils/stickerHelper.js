import crypto from 'crypto'
import { fileTypeFromBuffer } from 'file-type'

// Lazy load native modules
let sharp = null
let Sticker = null
let webp = null

async function loadModules() {
    if (sharp && Sticker && webp) return true
    
    try {
        sharp = (await import('sharp')).default
        const wsfModule = await import('wa-sticker-formatter')
        Sticker = wsfModule.Sticker
        webp = (await import('node-webpmux')).default
        return true
    } catch (error) {
        console.error('[Sticker] Module load failed:', error.message)
        return false
    }
}

/**
 * Strategy 1: wa-sticker-formatter (primary)
 */
async function createStickerWSF(buffer, packname, author) {
    await loadModules()
    if (!Sticker) throw new Error('WSF not available')
    
    try {
        const sticker = new Sticker(buffer, {
            pack: packname || 'SBMgrup',
            author: author || 'Bot',
            type: 'full',
            quality: 75
        })
        
        const result = await sticker.toBuffer()
        
        // Force cleanup
        buffer = null
        
        return result
    } catch (error) {
        // Cleanup on error
        buffer = null
        throw error
    }
}

/**
 * Strategy 2: Sharp + manual EXIF (fallback)
 */
async function createStickerSharp(buffer, packname, author) {
    await loadModules()
    if (!sharp) throw new Error('Sharp not available')
    
    // Detect file type
    const fileInfo = await fileTypeFromBuffer(buffer)
    const mime = fileInfo?.mime || 'image/jpeg'
    
    // Resize to 512x512 with white background
    const webpBuffer = await sharp(buffer)
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .webp({ quality: 75 })
        .toBuffer()
    
    // Add EXIF metadata
    return await addExif(webpBuffer, packname, author)
}

/**
 * Strategy 3: Raw zapo processing (last resort)
 */
async function createStickerRaw(buffer) {
    // Just return buffer, let zapo handle
    console.log('[Sticker] Using raw zapo processing')
    return buffer
}

/**
 * Add EXIF metadata to WebP sticker
 * Adopted from RTXZY project
 */
async function addExif(webpSticker, packname, author, categories = []) {
    await loadModules()
    if (!webp) {
        console.log('[Sticker] No webpmux, returning without EXIF')
        return webpSticker
    }
    
    try {
        const img = new webp.Image()
        const stickerPackId = crypto.randomBytes(32).toString('hex')
        
        const json = {
            'sticker-pack-id': stickerPackId,
            'sticker-pack-name': packname || 'SBMgrup',
            'sticker-pack-publisher': author || 'Bot',
            'emojis': categories
        }
        
        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00, 0x00, 0x00
        ])
        
        const exif = Buffer.concat([exifAttr, jsonBuffer])
        exif.writeUIntLE(jsonBuffer.length, 14, 4)
        
        await img.load(webpSticker)
        img.exif = exif
        
        return await img.save(null)
    } catch (error) {
        console.error('[Sticker] EXIF failed:', error.message)
        return webpSticker
    }
}

/**
 * Main function: Create sticker with multi-fallback
 */
export async function createSticker(buffer, options = {}) {
    const { packname, author } = options
    
    // Try strategies in order
    const strategies = [
        { name: 'Sharp+EXIF', fn: () => createStickerSharp(buffer, packname, author) }, // ponytail: WSF causing memory issues, use Sharp first
        { name: 'WSF', fn: () => createStickerWSF(buffer, packname, author) },
        { name: 'Raw', fn: () => createStickerRaw(buffer) }
    ]
    
    let lastError = null
    
    for (const strategy of strategies) {
        try {
            console.log(`[Sticker] Trying strategy: ${strategy.name}`)
            const result = await strategy.fn()
            
            // Validate result is WebP
            if (result && result.length > 12) {
                const header = result.toString('ascii', 0, 4)
                if (header === 'RIFF') {
                    console.log(`[Sticker] Success with: ${strategy.name}`)
                    return result
                }
            }
            
            throw new Error('Invalid WebP output')
        } catch (error) {
            console.log(`[Sticker] ${strategy.name} failed:`, error.message)
            lastError = error
            
            // Force garbage collection hint
            if (global.gc) global.gc()
        }
    }
    
    throw lastError || new Error('All sticker strategies failed')
}

/**
 * Process video/GIF to animated sticker
 */
export async function createAnimatedSticker(buffer, options = {}) {
    const { packname, author } = options
    
    try {
        await loadModules()
        if (!Sticker) throw new Error('WSF not available')
        
        const sticker = new Sticker(buffer, {
            pack: packname || 'SBMgrup',
            author: author || 'Bot',
            type: 'full',
            quality: 50
        })
        
        return await sticker.toBuffer()
    } catch (error) {
        console.error('[Sticker] Animated sticker failed:', error.message)
        // Fallback: return raw buffer for zapo
        return buffer
    }
}

/**
 * Legacy exports (backward compatible)
 */
export async function processImageToSticker(buffer, options = {}) {
    return createSticker(buffer, options)
}

export async function processVideoToSticker(buffer, options = {}) {
    return createAnimatedSticker(buffer, options)
}

export async function addStickerMetadata(buffer, packname, author) {
    return addExif(buffer, packname, author)
}
