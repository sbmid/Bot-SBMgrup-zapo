import { getContentType } from 'zapo-js'

/**
 * Lazy property definition - only computed when accessed
 */
export function lazy(target, key, getter) {
    Object.defineProperty(target, key, {
        get() {
            const val = getter(this)
            // Replace getter with actual value after first access
            Object.defineProperty(this, key, {
                value: val,
                enumerable: true,
                configurable: true
            })
            return val
        },
        enumerable: true,
        configurable: true
    })
}

/**
 * Extract identity pair (LID and Phone Number) from message key
 */
export function extractIdentityPair(key) {
    const normalizeJid = (jid) => {
        if (!jid) return null
        const cleaned = jid.split('/')[0].split(':')[0]
        return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`
    }
    
    const isLidJid = (jid) => jid && jid.includes('@lid')
    
    const primary = normalizeJid(key?.participant ?? key?.remoteJid)
    const alt = normalizeJid(key?.participantAlt ?? key?.remoteJidAlt)
    
    if (!primary || !alt) return { lidJid: null, pnJid: null }
    
    const primaryIsLid = isLidJid(primary)
    return {
        lidJid: primaryIsLid ? primary : alt,
        pnJid: primaryIsLid ? alt : primary
    }
}

/**
 * Special message type text extractors (buttons, lists, interactive)
 */
const SPECIAL_TEXT_EXTRACTORS = {
    interactiveResponseMessage(msgContent, fallback) {
        try {
            const params = JSON.parse(msgContent?.nativeFlowResponseMessage?.paramsJson || '{}')
            return params?.id || params?.selected_id || fallback
        } catch {
            return msgContent?.nativeFlowResponseMessage?.name || fallback
        }
    },
    templateButtonReplyMessage(msgContent, fallback) {
        return msgContent?.selectedId || msgContent?.selectedDisplayText || fallback
    },
    buttonsResponseMessage(msgContent, fallback) {
        return msgContent?.selectedButtonId || fallback
    },
    listResponseMessage(msgContent, fallback) {
        return msgContent?.singleSelectReply?.selectedRowId || fallback
    }
}

/**
 * Extract text from message (including special types like buttons)
 */
export function extractMessageText(message) {
    if (!message) return null
    
    const messageType = getContentType(message)
    if (!messageType) return null
    
    const msgContent = message[messageType]
    
    // Try standard text fields first
    let text = message.conversation 
        ?? message.extendedTextMessage?.text 
        ?? msgContent?.text
        ?? msgContent?.caption 
        ?? null
    
    // Try special extractors for interactive messages
    const extractSpecialText = SPECIAL_TEXT_EXTRACTORS[messageType]
    if (extractSpecialText) {
        text = extractSpecialText(msgContent, text)
    }
    
    return text
}

/**
 * Detect media type from mimetype
 */
export function detectMediaType(mimetype) {
    if (!mimetype) return null
    
    if (mimetype.startsWith('image/')) return 'image'
    if (mimetype.startsWith('video/')) return 'video'
    if (mimetype.startsWith('audio/')) return 'audio'
    if (mimetype === 'application/pdf') return 'document'
    if (mimetype.startsWith('application/')) return 'document'
    
    return 'unknown'
}
