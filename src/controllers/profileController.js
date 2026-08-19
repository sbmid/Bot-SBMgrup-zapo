import { getSessionManager } from '../utils/helpers.js'
import { readFileSync } from 'fs'

export async function getProfile(req, res, next) {
    try {
        const { sessionId, jid } = req.params
        const sessionManager = getSessionManager(req)
        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        const [picture, status] = await Promise.all([
            session.client.profile.getProfilePicture(jid),
            session.client.profile.getStatus(jid)
        ])

        res.json({
            success: true,
            profile: {
                jid,
                picture: picture.url,
                status: status.status
            }
        })
    } catch (error) {
        next(error)
    }
}

export async function setProfilePicture(req, res, next) {
    try {
        const { sessionId } = req.params
        const { imagePath } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        const imageBytes = readFileSync(imagePath)
        const pictureId = await session.client.profile.setProfilePicture(imageBytes)

        res.json({ success: true, pictureId })
    } catch (error) {
        next(error)
    }
}

export async function setStatus(req, res, next) {
    try {
        const { sessionId } = req.params
        const { status } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        await session.client.profile.setStatus(status)

        res.json({ success: true, message: 'Status updated' })
    } catch (error) {
        next(error)
    }
}
