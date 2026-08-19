import express from 'express'
import * as sessionController from '../controllers/sessionController.js'
import * as messageController from '../controllers/messageController.js'
import * as groupController from '../controllers/groupController.js'
import * as profileController from '../controllers/profileController.js'
import * as voipController from '../controllers/voipController.js'

const router = express.Router()

// Session Management
router.post('/sessions', sessionController.createSession)
router.get('/sessions', sessionController.listSessions)
router.get('/sessions/:sessionId', sessionController.getSession)
router.post('/sessions/:sessionId/connect', sessionController.connectSession)
router.post('/sessions/:sessionId/disconnect', sessionController.disconnectSession)
router.delete('/sessions/:sessionId', sessionController.deleteSession)
router.post('/sessions/:sessionId/webhook', sessionController.setWebhook)
router.get('/sessions/:sessionId/qr', sessionController.getQR)

// Messaging
router.post('/sessions/:sessionId/send-message', messageController.sendMessage)
router.post('/sessions/:sessionId/send-media', messageController.sendMedia)
router.post('/sessions/:sessionId/send-receipt', messageController.sendReceipt)

// Group Management
router.get('/sessions/:sessionId/groups', groupController.listGroups)
router.get('/sessions/:sessionId/groups/:groupJid', groupController.getGroupMetadata)
router.post('/sessions/:sessionId/groups', groupController.createGroup)
router.post('/sessions/:sessionId/groups/:groupJid/participants', groupController.addParticipants)
router.delete('/sessions/:sessionId/groups/:groupJid/participants', groupController.removeParticipants)
router.post('/sessions/:sessionId/groups/:groupJid/promote', groupController.promoteParticipants)
router.post('/sessions/:sessionId/groups/:groupJid/demote', groupController.demoteParticipants)
router.put('/sessions/:sessionId/groups/:groupJid/subject', groupController.updateSubject)
router.put('/sessions/:sessionId/groups/:groupJid/description', groupController.updateDescription)
router.post('/sessions/:sessionId/groups/:groupJid/leave', groupController.leaveGroup)

// Profile
router.get('/sessions/:sessionId/profile/:jid', profileController.getProfile)
router.put('/sessions/:sessionId/profile/picture', profileController.setProfilePicture)
router.put('/sessions/:sessionId/profile/status', profileController.setStatus)

// VoIP
router.post('/sessions/:sessionId/voip/call', voipController.makeCall)
router.post('/sessions/:sessionId/voip/:callId/accept', voipController.acceptCall)
router.post('/sessions/:sessionId/voip/:callId/reject', voipController.rejectCall)
router.post('/sessions/:sessionId/voip/:callId/end', voipController.endCall)

export default router
