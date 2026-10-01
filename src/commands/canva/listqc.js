export default {
    name: 'listqc',
    category: 'canva',
    description: 'Show available colors for .qc command',
    aliases: ['qccolors'],
    
    async execute(ctx) {
        const { reply } = ctx
        
        const colors = {
            'hitam': '#0C0C0C',
            'putih': '#FFFFFF',
            'merah': '#FF0000',
            'biru': '#0000FF',
            'hijau': '#00FF00',
            'kuning': '#FFFF00',
            'ungu': '#800080',
            'pink': '#FFC0CB',
            'orange': '#FFA500',
            'abu': '#808080'
        }
        
        let message = '*Available QC Colors*\n\n'
        message += 'Usage: `.qc <text> --<color>`\n\n'
        message += '*Colors:*\n'
        
        Object.entries(colors).forEach(([name, hex]) => {
            message += `• ${name} (${hex})\n`
        })
        
        message += '\n*Examples:*\n'
        message += '`.qc Hello world --hitam`\n'
        message += '`.qc Good morning --putih`\n'
        message += '`.qc Love you --merah`'
        
        return reply(message)
    }
}
