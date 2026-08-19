import { getSessionManager } from '../utils/helpers.js'

export async function makeCall(req, res, next) {
    try {
        const { sessionId } = req.params
        const { to, preloadedAudio } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        if (!session.client.voip) {
            return res.status(400).json({ success: false, error: 'VoIP not available' })
        }

        const callId = await session.client.voip.startCall(to, {
            video: false,
            preloadedAudio
        })

        res.json({ success: true, callId })
    } catch (error) {
        next(error)
    }
}

export async function acceptCall(req, res, next) {
    try {
        const { sessionId, callId } = req.params
        const sessionManager = getSessionManager(req)
        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        if (!session.client.voip) {
            return res.status(400).json({ success: false, error: 'VoIP not available' })
        }

        await session.client.voip.acceptCall(callId)

        res.json({ success: true, message: 'Call accepted' })
    } catch (error) {
        next(error)
    }
}

export async function rejectCall(req, res, next) {
    try {
        const { sessionId, callId } = req.params
        const { reason } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        if (!session.client.voip) {
            return res.status(400).json({ success: false, error: 'VoIP not available' })
        }

        await session.client.voip.rejectCall(callId, reason || 'Declined')

        res.json({ success: true, message: 'Call rejected' })
    } catch (error) {
        next(error)
    }
}

export async function endCall(req, res, next) {
    try {
        const { sessionId, callId } = req.params
        const { reason } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        if (!session.client.voip) {
            return res.status(400).json({ success: false, error: 'VoIP not available' })
        }

        await session.client.voip.endCall(callId, reason || 'UserEnded')

        res.json({ success: true, message: 'Call ended' })
    } catch (error) {
        next(error)
    }
}
