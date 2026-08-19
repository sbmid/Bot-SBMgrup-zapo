import { getSessionManager } from '../utils/helpers.js'
import { readFileSync } from 'fs'

export async function sendMessage(req, res, next) {
    try {
        const { sessionId } = req.params
        const { to, message, quote, mentions } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            })
        }

        if (session.status !== 'connected') {
            return res.status(400).json({
                success: false,
                error: 'Session not connected'
            })
        }

        const options = {}
        if (quote) options.quote = quote
        if (mentions) options.mentions = mentions

        const result = await session.client.message.send(to, message, options)

        res.json({
            success: true,
            messageId: result.id,
            ack: result.ack
        })
    } catch (error) {
        next(error)
    }
}

export async function sendMedia(req, res, next) {
    try {
        const { sessionId } = req.params
        const { to, type, mediaPath, mimetype, caption, fileName } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            })
        }

        if (session.status !== 'connected') {
            return res.status(400).json({
                success: false,
                error: 'Session not connected'
            })
        }

        // Read media file
        const media = readFileSync(mediaPath)

        const message = {
            type,
            media,
            mimetype
        }

        if (caption) message.caption = caption
        if (fileName) message.fileName = fileName

        const result = await session.client.message.send(to, message)

        res.json({
            success: true,
            messageId: result.id
        })
    } catch (error) {
        next(error)
    }
}

export async function sendReceipt(req, res, next) {
    try {
        const { sessionId } = req.params
        const { to, id, type, participant, listIds } = req.body
        const sessionManager = getSessionManager(req)

        const session = sessionManager.getSession(sessionId)

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            })
        }

        const receipt = { to, id, type }
        if (participant) receipt.participant = participant
        if (listIds) receipt.listIds = listIds

        await session.client.sendReceipt(receipt)

        res.json({
            success: true,
            message: 'Receipt sent'
        })
    } catch (error) {
        next(error)
    }
}
