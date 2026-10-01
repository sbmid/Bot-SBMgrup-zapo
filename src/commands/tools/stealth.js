// Zero-width characters untuk encoding
const ZERO = '\u200B' // Zero-width space
const ONE = '\u200C'  // Zero-width non-joiner
const SEP = '\u200D'  // Zero-width joiner (separator)

// Encode text ke binary lalu ke zero-width chars
function encodeHidden(hiddenText) {
    return hiddenText
        .split('')
        .map(char => {
            // Convert char ke binary (8-bit)
            const binary = char.charCodeAt(0).toString(2).padStart(8, '0')
            // Convert binary ke zero-width
            return binary.split('').map(bit => bit === '0' ? ZERO : ONE).join('')
        })
        .join(SEP)
}

// Decode zero-width chars ke text
function decodeHidden(text) {
    // Extract zero-width chars
    const hidden = text.match(/[\u200B\u200C\u200D]+/g)
    if (!hidden) return null
    
    try {
        // Join all hidden parts
        const hiddenStr = hidden.join('')
        
        // Split by separator
        const chars = hiddenStr.split(SEP).filter(s => s.length > 0)
        
        // Decode each char
        return chars.map(charBits => {
            // Convert zero-width to binary
            const binary = charBits
                .split('')
                .map(c => c === ZERO ? '0' : '1')
                .join('')
            
            // Convert binary to char
            return String.fromCharCode(parseInt(binary, 2))
        }).join('')
    } catch (e) {
        return null
    }
}

export default {
    name: 'stealth',
    category: 'tools',
    aliases: ['hide', 'steg', 'inject'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        if (args.length === 0) {
            return await send(
                '*[+] Stealth Message Injector*\n\n' +
                'Sembunyikan command dalam pesan biasa!\n\n' +
                '*Usage:*\n' +
                '.stealth <visible>|<hidden>\n\n' +
                '*Example:*\n' +
                '.stealth halo semua|.menu\n' +
                '.stealth selamat pagi|kontol\n\n' +
                '*How it works:*\n' +
                '• Visible text: yang dilihat user\n' +
                '• Hidden text: yang cuma bot deteksi\n' +
                '• Bot auto-execute hidden command\n\n' +
                '_Hidden text pake zero-width characters_'
            )
        }
        
        const fullText = args.join(' ')
        const parts = fullText.split('|')
        
        if (parts.length !== 2) {
            return await send('*[!]* Format salah!\n\nGunakan: .stealth <visible>|<hidden>')
        }
        
        const [visibleText, hiddenText] = parts.map(s => s.trim())
        
        if (!visibleText || !hiddenText) {
            return await send('*[!]* Visible dan hidden text tidak boleh kosong!')
        }
        
        // Encode hidden text
        const encoded = encodeHidden(hiddenText)
        
        // Combine: visible text + invisible encoded
        const stealthMessage = visibleText + encoded
        
        // Info untuk user
        const info = `*[✓] Stealth Message Created*\n\n` +
                    `📝 Visible: ${visibleText}\n` +
                    `🔒 Hidden: ${hiddenText}\n\n` +
                    `_Copy pesan di bawah dan kirim:_`
        
        await send(info)
        await send(stealthMessage)
    },
    
    // Export functions untuk digunakan CommandHandler
    encodeHidden,
    decodeHidden
}
