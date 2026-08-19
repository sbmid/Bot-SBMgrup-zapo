import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { SessionManager } from './services/SessionManager.js'
import apiRoutes from './routes/api.js'
import webRoutes from './routes/web.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

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
    console.log(`🚀 Server running on http://${HOST}:${PORT}`)
    console.log(`📱 SBMgrup - WhatsApp Multi-Session Bot Ready`)
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
export { sessionManager }

