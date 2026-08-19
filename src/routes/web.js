import express from 'express'

const router = express.Router()

// Dashboard home
router.get('/', (req, res) => {
    res.render('index')
})

// Sessions page
router.get('/sessions', (req, res) => {
    res.render('sessions')
})

// Session detail page
router.get('/sessions/:sessionId', (req, res) => {
    res.render('session-detail', { sessionId: req.params.sessionId })
})

// Send message page
router.get('/sessions/:sessionId/send', (req, res) => {
    res.render('send-message', { sessionId: req.params.sessionId })
})

// Groups page
router.get('/sessions/:sessionId/groups', (req, res) => {
    res.render('groups', { sessionId: req.params.sessionId })
})

// Webhooks page
router.get('/sessions/:sessionId/webhooks', (req, res) => {
    res.render('webhooks', { sessionId: req.params.sessionId })
})

// VoIP page
router.get('/sessions/:sessionId/voip', (req, res) => {
    res.render('voip', { sessionId: req.params.sessionId })
})

export default router
