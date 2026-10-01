import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export default {
    name: 'uninstall',
    category: 'owner',
    aliases: ['remove', 'rm'],
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, args } = ctx
        
        if (args.length === 0) {
            return await send(
                '*[+] Package Uninstaller*\n\n' +
                'Usage: .uninstall <package> [...packages]\n' +
                'Alias: .remove / .rm\n\n' +
                '*Examples:*\n' +
                '• .uninstall axios\n' +
                '• .uninstall lodash moment\n\n' +
                '_⚠️ Owner only command_'
            )
        }
        
        const packages = args.filter(pkg => pkg.trim())
        
        if (packages.length === 0) {
            return await send('*[!]* Please specify package name(s)')
        }
        
        // Check if package.json exists
        const packageJsonPath = path.join(process.cwd(), 'package.json')
        if (!fs.existsSync(packageJsonPath)) {
            return await send('*[!]* package.json not found!')
        }
        
        // Read package.json to verify packages exist
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        const notInstalled = packages.filter(pkg => {
            return !packageJson.dependencies?.[pkg] && !packageJson.devDependencies?.[pkg]
        })
        
        if (notInstalled.length === packages.length) {
            return await send(
                `*[!]* None of the packages are installed:\n\n` +
                notInstalled.join('\n')
            )
        }
        
        if (notInstalled.length > 0) {
            await send(
                `*[~]* Some packages not found:\n` +
                notInstalled.join(', ') + '\n\n' +
                `Proceeding with: ${packages.filter(p => !notInstalled.includes(p)).join(', ')}`
            )
        }
        
        await send(
            `*[~] Uninstalling Package(s)*\n\n` +
            `📦 Packages: ${packages.join(', ')}\n` +
            `⏳ Removing...\n\n` +
            `_This may take a moment..._`
        )
        
        try {
            const uninstallCommand = `npm uninstall ${packages.join(' ')}`
            const { stdout, stderr } = await execAsync(uninstallCommand, {
                cwd: process.cwd(),
                timeout: 60000, // 1 minute
                maxBuffer: 1024 * 1024 * 5
            })
            
            let message = '*[+] Uninstall Complete!*\n\n'
            message += '*Removed:*\n'
            message += packages.map((pkg, i) => `${i + 1}. ${pkg}`).join('\n')
            
            if (stderr && stderr.trim()) {
                message += '\n\n*Warnings:*\n'
                message += '```' + stderr.slice(0, 500) + '```'
            }
            
            message += '\n\n_✅ Packages removed_'
            
            await send(message)
            
        } catch (error) {
            console.error('Uninstall error:', error)
            
            await send(
                `*[!]* Uninstall Failed\n\n` +
                `*Error:* ${error.message}\n\n` +
                (error.stderr ? '```' + error.stderr.toString().slice(0, 500) + '```' : '')
            )
        }
    }
}
