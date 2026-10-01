/**
 * Extract quoted/replied message from incoming message event
 * @param {Object} event - WaIncomingMessageEvent
 * @returns {Object|null} Full quoted message object or null
 */
export function getQuotedMessage(event) {
    if (!event?.message) return null
    
    // Check all possible message types that can have contextInfo
    const msg = event.message
    
    // Priority order: check most common types first
    const contextInfo = 
        msg.extendedTextMessage?.contextInfo ||
        msg.imageMessage?.contextInfo ||
        msg.videoMessage?.contextInfo ||
        msg.audioMessage?.contextInfo ||
        msg.documentMessage?.contextInfo ||
        msg.stickerMessage?.contextInfo ||
        msg.buttonsResponseMessage?.contextInfo ||
        msg.listResponseMessage?.contextInfo ||
        msg.templateButtonReplyMessage?.contextInfo ||
        null
    
    // Return full quotedMessage object (not just specific field)
    return contextInfo?.quotedMessage || null
}

/**
 * Get media message that can be downloaded (either quoted or current)
 * Returns object with: { message, isQuoted } where message is full Proto.IMessage
 * @param {Object} event - WaIncomingMessageEvent
 * @param {string} type - Media type: 'image', 'video', 'audio', 'sticker', 'document'
 * @returns {Object|null} { message: Proto.IMessage, isQuoted: boolean } or null
 */
export function getDownloadableMedia(event, type) {
    if (!event?.message) return null
    
    const mediaField = `${type}Message`
    
    // Check current message first
    // Format 1: Media dikirim langsung (dengan/tanpa caption)
    // event.message.imageMessage = { url, caption, ... }
    if (event.message[mediaField]) {
        return {
            message: event.message,
            isQuoted: false
        }
    }
    
    // Format 2: Reply/quoted message
    // Check quoted message - return FULL quoted message for download
    const quoted = getQuotedMessage(event)
    if (quoted?.[mediaField]) {
        return {
            message: quoted,
            isQuoted: true
        }
    }
    
    return null
}
