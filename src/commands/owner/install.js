import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// Daftar package yang di-blacklist (berbahaya/tidak perlu)
const BLACKLIST = [
    'rm-rf',
    'rimraf',
    'shelljs',
    'child-process-promise',
    'exec-async',
    // Add more dangerous packages here
]

// Daftar package yang umum dipakai (whitelist untuk suggestion)
const COMMON_PACKAGES = [
    'axios',
    'lodash',
    'moment',
    'cheerio',
    'puppeteer',
    'jimp',
    'canvas',
    'fluent-ffmpeg',
    'form-data',
    'node-fetch',
    'ws',
    'socket.io'
]

export default {
    name: 'install',
    category: 'owner',
    aliases: ['npm', 'pkg'],
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, args, reply } = ctx
        
        if (args.length === 0) {
            return await send(
                '*[+] Package Installer*\n\n' +
                'Usage: .install <package[@version]> [...packages]\n' +
                'Alias: .npm / .pkg\n\n' +
                '*Examples:*\n' +
                '• .install axios\n' +
                '• .install express@4.18.0\n' +
                '• .install lodash moment cheerio\n\n' +
                '*Common Packages:*\n' +
                COMMON_PACKAGES.map((pkg, i) => `${i + 1}. ${pkg}`).join('\n') + '\n\n' +
                '_⚠️ Owner only command_'
            )
        }
        
        const packages = args.filter(pkg => pkg.trim())
        
        if (packages.length === 0) {
            return await send('*[!]* Please specify package name(s)')
        }
        
        // Security check: Blacklist
        const blacklisted = packages.filter(pkg => {
            const pkgName = pkg.split('@')[0].toLowerCase()
            return BLACKLIST.some(bad => pkgName.includes(bad))
        })
        
        if (blacklisted.length > 0) {
            return await send(
                `*[!]* Blacklisted package detected!\n\n` +
                `Blocked: ${blacklisted.join(', ')}\n\n` +
                `_These packages are not allowed for security reasons._`
            )
        }
        
        // Security check: Validate package names (basic)
        const invalidPackages = packages.filter(pkg => {
            // Allow: package-name, @scope/package, package@version
            return !/^(@[\w-]+\/)?[\w-]+(@[\w.-]+)?$/.test(pkg)
        })
        
        if (invalidPackages.length > 0) {
            return await send(
                `*[!]* Invalid package name(s):\n\n` +
                invalidPackages.join('\n') + '\n\n' +
                `_Use format: package-name or package@version_`
            )
        }
        
        // Confirmation message
        await send(
            `*[~] Installing Package(s)*\n\n` +
            `📦 Packages: ${packages.join(', ')}\n` +
            `⏳ Installing...\n\n` +
            `_This may take a while..._`
        )
        
        try {
            // Check if package.json exists
            const packageJsonPath = path.join(process.cwd(), 'package.json')
            if (!fs.existsSync(packageJsonPath)) {
                return await send('*[!]* package.json not found!')
            }
            
            // Install packages
            const installCommand = `npm install ${packages.join(' ')} --save`
            const { stdout, stderr } = await execAsync(installCommand, {
                cwd: process.cwd(),
                timeout: 120000, // 2 minute timeout
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            })
            
            // Read updated package.json
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
            const installedVersions = packages.map(pkg => {
                const pkgName = pkg.split('@')[0]
                const version = packageJson.dependencies?.[pkgName] || 
                               packageJson.devDependencies?.[pkgName] ||
                               'unknown'
                return `${pkgName}@${version.replace('^', '').replace('~', '')}`
            })
            
            // Success message
            let message = '*[+] Installation Complete!*\n\n'
            message += '*Installed:*\n'
            message += installedVersions.map((v, i) => `${i + 1}. ${v}`).join('\n')
            
            if (stderr && stderr.trim()) {
                message += '\n\n*Warnings:*\n'
                message += '```' + stderr.slice(0, 500) + '```'
            }
            
            message += '\n\n_✅ Packages are ready to use_\n'
            message += '_Note: Restart bot if needed_'
            
            await send(message)
            
        } catch (error) {
            console.error('Install error:', error)
            
            let errorMsg = '*[!]* Installation Failed\n\n'
            
            if (error.code === 'ETIMEDOUT') {
                errorMsg += '*Error:* Installation timeout (>2 minutes)\n'
                errorMsg += '_Package too large or network slow_'
            } else if (error.stderr) {
                const stderr = error.stderr.toString()
                errorMsg += '*Error Output:*\n'
                errorMsg += '```' + stderr.slice(0, 800) + '```'
                
                // Detect common errors
                if (stderr.includes('404') || stderr.includes('Not Found')) {
                    errorMsg += '\n\n💡 Package not found on npm registry'
                } else if (stderr.includes('EACCES') || stderr.includes('permission denied')) {
                    errorMsg += '\n\n💡 Permission denied - check file permissions'
                } else if (stderr.includes('ENOSPC')) {
                    errorMsg += '\n\n💡 No space left on device'
                }
            } else {
                errorMsg += '*Error:* ' + (error.message || 'Unknown error')
            }
            
            await send(errorMsg)
        }
    }
}
