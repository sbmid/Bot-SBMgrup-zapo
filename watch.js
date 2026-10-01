import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

// Directories to watch
const WATCH_DIRS = ['src', 'views', 'public']

// File extensions to watch
const WATCH_EXTS = ['.js', '.json', '.ejs', '.html', '.env']

// Ignored folders or filenames
const IGNORE_PATHS = ['node_modules', 'sessions', 'data', '.git', 'temp']

let childProcess = null
let isRestarting = false
let debounceTimer = null

function startApp() {
    console.log('\n🚀 [AutoWatcher] Starting Bot Process...')

    childProcess = spawn('node', ['src/index.js'], {
        stdio: 'inherit',
        env: process.env,
        shell: false
    })

    childProcess.on('exit', (code, signal) => {
        if (!isRestarting) {
            console.log(`[AutoWatcher] Process exited with code ${code} (signal: ${signal})`)
        }
    })
}

function restartApp(reason) {
    if (isRestarting) return
    isRestarting = true

    console.log(`\n🔄 [AutoWatcher] Change detected in ${reason}. Restarting Bot...`)

    if (childProcess && !childProcess.killed) {
        childProcess.removeAllListeners('exit')
        childProcess.kill('SIGINT')

        // Force kill if it doesn't shut down in 2 seconds
        const forceKillTimer = setTimeout(() => {
            if (childProcess && !childProcess.killed) {
                childProcess.kill('SIGKILL')
            }
        }, 2000)

        childProcess.on('exit', () => {
            clearTimeout(forceKillTimer)
            isRestarting = false
            startApp()
        })
    } else {
        isRestarting = false
        startApp()
    }
}

function setupWatcher() {
    console.log('👀 [AutoWatcher] Initializing file watcher (without nodemon)...')

    WATCH_DIRS.forEach(dir => {
        const targetPath = path.join(process.cwd(), dir)
        if (!fs.existsSync(targetPath)) return

        try {
            fs.watch(targetPath, { recursive: true }, (eventType, filename) => {
                if (!filename) return

                // Check ignore paths
                if (IGNORE_PATHS.some(ignore => filename.includes(ignore))) return

                // Check allowed extensions
                const ext = path.extname(filename)
                if (WATCH_EXTS.includes(ext) || filename.endsWith('.env')) {
                    clearTimeout(debounceTimer)
                    debounceTimer = setTimeout(() => {
                        restartApp(filename)
                    }, 500)
                }
            })
            console.log(` -> Watching directory: ${dir}`)
        } catch (err) {
            console.error(` -> Failed to watch ${dir}:`, err.message)
        }
    })
}

// Start watching and start application
setupWatcher()
startApp()

// Handle termination signals
process.on('SIGINT', () => {
    if (childProcess) childProcess.kill('SIGINT')
    process.exit(0)
})

process.on('SIGTERM', () => {
    if (childProcess) childProcess.kill('SIGTERM')
    process.exit(0)
})
