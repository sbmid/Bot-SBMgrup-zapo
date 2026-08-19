import QRCode from 'qrcode'

export async function createSession(req, res, next) {
    try {
        const { sessionId } = req.body
        const sessionManager = req.app.locals.sessionManager

        console.log('Creating session:', sessionId)
        console.log('SessionManager exists:', !!sessionManager)

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'sessionId is required'
            })
        }

        const session = await sessionManager.createSession(sessionId)
        
        console.log('Session created successfully:', session.id)

        res.json({
            success: true,
            session: {
                id: session.id,
                status: session.status,
                createdAt: session.createdAt
            }
        })
    } catch (error) {
        console.error('Error creating session:', error)
        next(error)
    }
}

export function listSessions(req, res) {
    const sessionManager = req.app.locals.sessionManager
    const sessions = sessionManager.listSessions()
    
    // Debug: log all session IDs
    console.log('Available sessions:', Array.from(sessionManager.sessions.keys()))
    
    res.json({
        success: true,
        sessions
    })
}

export function getSession(req, res) {
    const { sessionId } = req.params
    // Decode URL encoded session ID
    const decodedSessionId = decodeURIComponent(sessionId)
    const sessionManager = req.app.locals.sessionManager
    const session = sessionManager.getSession(decodedSessionId)

    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session not found'
        })
    }

    res.json({
        success: true,
        session: {
            id: session.id,
            status: session.status,
            hasQr: !!session.qr,
            hasWebhook: !!session.webhookConfig,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity
        }
    })
}

export async function connectSession(req, res, next) {
    try {
        const { sessionId } = req.params
        const decodedSessionId = decodeURIComponent(sessionId)
        const sessionManager = req.app.locals.sessionManager
        const session = sessionManager.getSession(decodedSessionId)

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            })
        }

        await session.client.connect()

        res.json({
            success: true,
            message: 'Connecting...'
        })
    } catch (error) {
        next(error)
    }
}

export async function disconnectSession(req, res, next) {
    try {
        const { sessionId } = req.params
        const decodedSessionId = decodeURIComponent(sessionId)
        const sessionManager = req.app.locals.sessionManager
        const session = sessionManager.getSession(decodedSessionId)

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            })
        }

        await session.client.disconnect()

        res.json({
            success: true,
            message: 'Disconnected'
        })
    } catch (error) {
        next(error)
    }
}

export async function deleteSession(req, res, next) {
    try {
        const { sessionId } = req.params
        const decodedSessionId = decodeURIComponent(sessionId)
        const sessionManager = req.app.locals.sessionManager
        const success = await sessionManager.deleteSession(decodedSessionId)

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            })
        }

        res.json({
            success: true,
            message: 'Session deleted'
        })
    } catch (error) {
        next(error)
    }
}

export function setWebhook(req, res) {
    const { sessionId } = req.params
    const decodedSessionId = decodeURIComponent(sessionId)
    const { url, events, secret } = req.body
    const sessionManager = req.app.locals.sessionManager

    const session = sessionManager.getSession(decodedSessionId)

    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session not found'
        })
    }

    if (!url || !events) {
        return res.status(400).json({
            success: false,
            error: 'url and events are required'
        })
    }

    session.webhookConfig = { url, events, secret }

    res.json({
        success: true,
        message: 'Webhook configured'
    })
}

export async function getQR(req, res, next) {
    try {
        const { sessionId } = req.params
        const decodedSessionId = decodeURIComponent(sessionId)
        const sessionManager = req.app.locals.sessionManager
        const session = sessionManager.getSession(decodedSessionId)

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            })
        }

        if (!session.qr) {
            return res.status(404).json({
                success: false,
                error: 'QR code not available'
            })
        }

        // Generate QR code image
        const qrImage = await QRCode.toDataURL(session.qr)

        res.json({
            success: true,
            qr: session.qr,
            qrImage
        })
    } catch (error) {
        next(error)
    }
}
