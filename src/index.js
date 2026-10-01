import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { SessionManager } from './services/SessionManager.js'
import { initContactsDB } from './database/contacts.js'
import apiRoutes from './routes/api.js'
import webRoutes from './routes/web.js'
import secondaryRoutes from './routes/secondary.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const app2 = express() // Secondary app for port 3001
const PORT = process.env.PORT || 3000
const PORT2 = process.env.PORT2 || 3001
const HOST = process.env.HOST || '0.0.0.0'

// Initialize databases
initContactsDB()

// Initialize Session Manager
const sessionManager = new SessionManager()

// Initialize command handler
await sessionManager.initialize()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '../public')))

// Set view engine
app.set('views', path.join(__dirname, '../views'))
app.set('view engine', 'ejs')

// Make sessionManager available to routes
app.locals.sessionManager = sessionManager

// Routes
app.use('/api', apiRoutes)
app.use('/', webRoutes)

// Secondary app setup (Port 3001)
app2.use(express.json())
app2.use(express.urlencoded({ extended: true }))
app2.use(express.static(path.join(__dirname, '../public')))
app2.set('views', path.join(__dirname, '../views'))
app2.set('view engine', 'ejs')
app2.locals.sessionManager = sessionManager

// Secondary routes
app2.use('/', secondaryRoutes)

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err)
    console.error('Stack:', err.stack)
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    })
})

// Start server
app.listen(PORT, HOST, () => {
    console.log(`🚀 Main Server running on http://${HOST}:${PORT}`)
    console.log(`📱 SBMgrup - WhatsApp Multi-Session Bot Ready`)
})

// Start secondary server
app2.listen(PORT2, HOST, () => {
    console.log(`🎯 Secondary Server running on http://${HOST}:${PORT2}`)
    console.log(`✨ Feature Server Ready`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down gracefully...')
    await sessionManager.shutdownAll()
    process.exit(0)
})

process.on('SIGTERM', async () => {
    console.log('\n⏹️  Shutting down gracefully...')
    await sessionManager.shutdownAll()
    process.exit(0)
})

// Export sessionManager
export { sessionManager, app2 }

