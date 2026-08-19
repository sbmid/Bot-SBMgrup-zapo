// Get session manager from request
export function getSessionManager(req) {
    return req.app.locals.sessionManager
}

// Get session by ID with error handling
export function getSessionOrFail(req, res) {
    const { sessionId } = req.params
    const sessionManager = getSessionManager(req)
    const session = sessionManager.getSession(sessionId)
    
    if (!session) {
        res.status(404).json({
            success: false,
            error: 'Session not found'
        })
        return null
    }
    
    if (session.status !== 'connected') {
        res.status(400).json({
            success: false,
            error: 'Session not connected'
        })
        return null
    }
    
    return session
}

// Get real phone JID from event (handles LID users)
export function getRealJid(event) {
    // For group messages from LID users
    if (event?.key?.participantAlt) {
        return event.key.participantAlt
    }
    
    // For private chat from LID users
    if (event?.key?.remoteJidAlt) {
        return event.key.remoteJidAlt
    }
    
    // Fallback to original JID
    return event?.key?.participant || event?.key?.remoteJid
}

// Check if user is owner
export function isOwner(jid, event = null) {
    const ownerNumbers = (process.env.OWNER_NUMBERS || '').split(',').map(n => n.trim())
    
    // Extract number from JID (handle both regular and LID format)
    let number = jid.split('@')[0]
    
    // Handle participant JID format (in groups)
    if (number.includes(':')) {
        number = number.split(':')[0]
    }
    
    // Check main JID
    if (ownerNumbers.includes(number)) return true
    
    // Check participantAlt (LID in groups)
    if (event?.key?.participantAlt) {
        const altNumber = event.key.participantAlt.split('@')[0]
        if (ownerNumbers.includes(altNumber)) return true
    }
    
    // Check remoteJidAlt (LID in private chat)
    if (event?.key?.remoteJidAlt) {
        const altNumber = event.key.remoteJidAlt.split('@')[0]
        if (ownerNumbers.includes(altNumber)) return true
    }
    
    return false
}
