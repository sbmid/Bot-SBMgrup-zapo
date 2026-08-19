import { getSessionManager } from '../utils/helpers.js'

export async function listGroups(req, res, next) {
    try {
        const { sessionId } = req.params
        const sessionManager = getSessionManager(req)
        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        const groups = await session.client.group.queryAllGroups()

        res.json({ success: true, groups })
    } catch (error) {
        next(error)
    }
}

export async function getGroupMetadata(req, res, next) {
    try {
        const { sessionId, groupJid } = req.params
        const sessionManager = getSessionManager(req)
        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        const metadata = await session.client.group.queryGroupMetadata(groupJid)

        res.json({ success: true, metadata })
    } catch (error) {
        next(error)
    }
}

export async function createGroup(req, res, next) {
    try {
        const { sessionId } = req.params
        const { subject, participants, description } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        const result = await session.client.group.createGroup(
            subject,
            participants,
            { description }
        )

        res.json({ success: true, result })
    } catch (error) {
        next(error)
    }
}

export async function addParticipants(req, res, next) {
    try {
        const { sessionId, groupJid } = req.params
        const { participants } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        await session.client.group.addParticipants(groupJid, participants)

        res.json({ success: true, message: 'Participants added' })
    } catch (error) {
        next(error)
    }
}

export async function removeParticipants(req, res, next) {
    try {
        const { sessionId, groupJid } = req.params
        const { participants } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        await session.client.group.removeParticipants(groupJid, participants)

        res.json({ success: true, message: 'Participants removed' })
    } catch (error) {
        next(error)
    }
}

export async function promoteParticipants(req, res, next) {
    try {
        const { sessionId, groupJid } = req.params
        const { participants } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        await session.client.group.promoteParticipants(groupJid, participants)

        res.json({ success: true, message: 'Participants promoted' })
    } catch (error) {
        next(error)
    }
}

export async function demoteParticipants(req, res, next) {
    try {
        const { sessionId, groupJid } = req.params
        const { participants } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        await session.client.group.demoteParticipants(groupJid, participants)

        res.json({ success: true, message: 'Participants demoted' })
    } catch (error) {
        next(error)
    }
}

export async function updateSubject(req, res, next) {
    try {
        const { sessionId, groupJid } = req.params
        const { subject } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        await session.client.group.setSubject(groupJid, subject)

        res.json({ success: true, message: 'Subject updated' })
    } catch (error) {
        next(error)
    }
}

export async function updateDescription(req, res, next) {
    try {
        const { sessionId, groupJid } = req.params
        const { description } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        await session.client.group.setDescription(groupJid, description)

        res.json({ success: true, message: 'Description updated' })
    } catch (error) {
        next(error)
    }
}

export async function leaveGroup(req, res, next) {
    try {
        const { sessionId, groupJid } = req.params
        const sessionManager = getSessionManager(req)
        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' })
        }

        await session.client.group.leaveGroup([groupJid])

        res.json({ success: true, message: 'Left group' })
    } catch (error) {
        next(error)
    }
}
