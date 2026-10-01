import fs from 'fs/promises'
import axios from 'axios'

const MENU_IMAGE_PATH = './data/menu-image.jpg'
const GROUP_URL_PATH = './data/group-url.txt'

const DEFAULT_MAIN_IMAGE_URL = 'https://i.pinimg.com/236x/51/ec/eb/51eceb30971f5d1af54b423d36e90c24.jpg'
const DEFAULT_THUMBNAIL_URL = 'https://i.pinimg.com/736x/02/59/8c/02598ca6ee76ae9ffd2f32615deaf379.jpg'

export default {
    name: 'menu',
    description: 'Show command menu dengan gambar utama & thumbnail banner preview',
    category: 'menu',

    async execute(ctx) {
        const { session, reply, chatJid, event } = ctx

        // Ambil daftar menu dari command handler
        const commandHandler = session.commandHandler
        const menuText = commandHandler.getMenu()

        // Cek URL grup (jika ada)
        let groupUrl = null
        try {
            groupUrl = (await fs.readFile(GROUP_URL_PATH, 'utf8')).trim()
        } catch (err) {
            // Tidak ada URL grup
        }

        // Cek buffer gambar utama (prioritas file lokal -> fallback URL)
        let mainImageBuffer = null
        try {
            mainImageBuffer = await fs.readFile(MENU_IMAGE_PATH)
        } catch (err) {
            try {
                const resMain = await axios.get(DEFAULT_MAIN_IMAGE_URL, {
                    responseType: 'arraybuffer',
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                })
                if (resMain.data) mainImageBuffer = Buffer.from(resMain.data)
            } catch (e) {
                console.log('[Menu] Gagal unduh main image URL:', e.message)
            }
        }

        // Unduh buffer thumbnail banner
        let thumbnailBuffer = null
        try {
            const resThumb = await axios.get(DEFAULT_THUMBNAIL_URL, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            })
            if (resThumb.data) thumbnailBuffer = Buffer.from(resThumb.data)
        } catch (e) {
            console.log('[Menu] Gagal unduh thumbnail URL:', e.message)
        }

        // Object externalAdReply untuk thumbnail banner preview
        const externalAdReplyObj = {
            title: ' ',
            body: 'Multi-Session WhatsApp Bot',
            mediaType: 1, // Image
            previewType: 0,
            renderLargerThumbnail: true,
            thumbnailUrl: DEFAULT_THUMBNAIL_URL,
            thumbnail: thumbnailBuffer || undefined,
            sourceUrl: DEFAULT_MAIN_IMAGE_URL,
            showAdAttribution: true
        }

        const contextInfoObj = {
            externalAdReply: externalAdReplyObj,
            raw: {
                externalAdReply: externalAdReplyObj
            }
        }

        try {
            // Opsi 1: Jika ada URL grup -> Kirim Interactive Message Button + contextInfo banner
            if (groupUrl) {
                await session.client.message.send(chatJid, {
                    interactiveMessage: {
                        body: { text: menuText },
                        footer: { text: '© SBMgrup Bot' },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: 'cta_url',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: '📱 Join Group',
                                        url: groupUrl
                                    })
                                }
                            ],
                            messageVersion: 1
                        }
                    },
                    contextInfo: contextInfoObj
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })

            // Opsi 2: Kirim sebagai pesan Gambar Utama + Caption Menu + Thumbnail ExternalAdReply Banner
            } else if (mainImageBuffer) {
                await session.client.message.send(chatJid, {
                    type: 'image',
                    media: mainImageBuffer,
                    mimetype: 'image/jpeg',
                    caption: menuText,
                    contextInfo: contextInfoObj
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })

            // Opsi 3: Fallback teks dengan contextInfo banner
            } else {
                await session.client.message.send(chatJid, {
                    type: 'text',
                    text: menuText,
                    contextInfo: contextInfoObj
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })
            }

        } catch (error) {
            console.error('[Menu Error]:', error)
            await reply(menuText)
        }
    }
}
