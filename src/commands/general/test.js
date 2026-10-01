import { proto } from 'zapo-js'

export default {
    name: 'test',
    category: 'general',
    
    async execute(ctx) {
        const { send, reply, session, args, chatJid, event } = ctx
        
        const testType = args[0]?.toLowerCase()
        
        if (!testType) {
            return await send(
                '*[+] Test Command*\n\n' +
                'Usage: .test <type>\n\n' +
                '*Available Tests:*\n' +
                '1. text - Plain text\n' +
                '2. link - Extended text with link preview\n' +
                '3. quote - Reply with quote\n' +
                '4. mention - Mention users\n' +
                '5. button - Quick reply buttons (3 buttons)\n' +
                '6. list - List message (dropdown menu)\n' +
                '7. location - Location message\n' +
                '8. contact - Contact vCard\n' +
                '9. react - React to message\n' +
                '10. poll - Poll message\n' +
                '11. image - Send image\n' +
                '12. video - Send video\n' +
                '13. audio - Send audio\n' +
                '14. voice - Send voice note\n' +
                '15. document - Send document\n' +
                '16. viewonce - View once image\n' +
                '17. sticker - Send sticker\n' +
                '18. all - Run all tests'
            )
        }
        
        try {
            switch (testType) {
                case 'text':
                    await testPlainText(ctx)
                    break
                    
                case 'link':
                    await testLinkPreview(ctx)
                    break
                    
                case 'quote':
                    await testQuote(ctx)
                    break
                    
                case 'mention':
                    await testMention(ctx)
                    break
                    
                case 'react':
                    await testReaction(ctx)
                    break
                    
                case 'button':
                    await testButton(ctx)
                    break
                    
                case 'list':
                    await testList(ctx)
                    break
                    
                case 'location':
                    await testLocation(ctx)
                    break
                    
                case 'contact':
                    await testContact(ctx)
                    break
                    
                case 'poll':
                    await testPoll(ctx)
                    break
                    
                case 'image':
                    await testImage(ctx)
                    break
                    
                case 'video':
                    await testVideo(ctx)
                    break
                    
                case 'audio':
                    await testAudio(ctx)
                    break
                    
                case 'voice':
                    await testVoiceNote(ctx)
                    break
                    
                case 'document':
                    await testDocument(ctx)
                    break
                    
                case 'viewonce':
                    await testViewOnce(ctx)
                    break
                    
                case 'sticker':
                    await testSticker(ctx)
                    break
                    
                case 'all':
                    await runAllTests(ctx)
                    break
                    
                default:
                    await send('*[!]* Unknown test type. Use: test (without args) for help')
            }
        } catch (error) {
            console.error('Test error:', error)
            await send(`*[!]* Test failed: ${error.message}`)
        }
    }
}

// Test 1: Plain Text
async function testPlainText(ctx) {
    const { send } = ctx
    await send('*[+] Test: Plain Text*\n\nThis is a simple text message.')
}

// Test 2: Link Preview (Extended Text)
async function testLinkPreview(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Link Preview*\n\nSending extended text with link preview...')
    
    await session.client.message.send(
        chatJid,
        {
            extendedTextMessage: {
                text: '*Link Preview Test*\n\nCheck out this amazing website!\n\nhttps://github.com/vinikjkkj/zapo',
                matchedText: 'https://github.com/vinikjkkj/zapo',
                canonicalUrl: 'https://github.com/vinikjkkj/zapo',
                title: 'Zapo - WhatsApp Web Protocol',
                description: 'High-performance WhatsApp Web implementation in TypeScript'
            }
        }
    )
}

// Test 3: Quote/Reply
async function testQuote(ctx) {
    const { session, chatJid, event, send } = ctx
    
    if (!event.key || !event.message) {
        return await send('*[!]* Reply to a message to test quote feature')
    }
    
    await session.client.message.send(
        chatJid,
        '*[+] Test: Quote*\n\nThis is a quoted reply to your message!',
        {
            quote: {
                key: event.key,
                message: event.message
            }
        }
    )
}

// Test 4: Mention
async function testMention(ctx) {
    const { session, chatJid, senderJid, send, isGroup, event } = ctx
    
    if (!isGroup) {
        return await send('*[!]* Mention test only works in groups')
    }
    
    // Get sender's real JID (handle LID)
    const mentionJid = event.key?.participantAlt || event.key?.participant || senderJid
    
    await session.client.message.send(
        chatJid,
        `*[+] Test: Mention*\n\nHello @${mentionJid.split('@')[0]}! This is a mention test.`,
        {
            mentions: [mentionJid]
        }
    )
}

// Test 5: Reaction (React to message)
async function testReaction(ctx) {
    const { session, chatJid, event, send } = ctx
    
    if (!event.key || !event.message) {
        return await send('*[!]* Reply to a message to test reaction')
    }
    
    try {
        await session.client.message.send(chatJid, {
            type: 'reaction',
            target: event,
            emoji: '👍'
        })
        await send('*[+] Test: Reaction*\n\nReaction sent! Check the message you replied to.')
    } catch (error) {
        await send(`*[!]* Reaction failed: ${error.message}`)
    }
}

// Test 6: Button Message (Quick Reply)
async function testButton(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Button Message*\n\nSending button message...')
    
    await session.client.message.send(chatJid, {
        buttonsMessage: {
            contentText: 'Welcome to SBMgrup Bot!',
            footerText: 'Powered by Zapo-JS',
            headerType: proto.Message.ButtonsMessage.HeaderType.TEXT,
            text: 'Choose an option below:',
            buttons: [
                {
                    buttonId: 'btn_menu',
                    buttonText: { displayText: '📋 Menu' },
                    type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
                },
                {
                    buttonId: 'btn_help',
                    buttonText: { displayText: '❓ Help' },
                    type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
                },
                {
                    buttonId: 'btn_info',
                    buttonText: { displayText: 'ℹ️ Info' },
                    type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
                }
            ]
        }
    })
}

// Test 7: List Message
async function testList(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: List Message*\n\nSending list message...')
    
    await session.client.message.send(chatJid, {
        listMessage: {
            title: 'Bot Commands',
            description: 'Select a category to see available commands',
            buttonText: 'Open Menu',
            footerText: 'SBMgrup Bot v1.0',
            listType: proto.Message.ListMessage.ListType.SINGLE_SELECT,
            sections: [
                {
                    title: 'General Commands',
                    rows: [
                        {
                            title: 'Menu',
                            rowId: 'row_menu',
                            description: 'Show all commands'
                        },
                        {
                            title: 'Ping',
                            rowId: 'row_ping',
                            description: 'Check bot latency'
                        },
                        {
                            title: 'Info',
                            rowId: 'row_info',
                            description: 'Bot information'
                        }
                    ]
                },
                {
                    title: 'Owner Commands',
                    rows: [
                        {
                            title: 'Update',
                            rowId: 'row_update',
                            description: 'Update bot from GitHub'
                        },
                        {
                            title: 'Restart',
                            rowId: 'row_restart',
                            description: 'Restart bot process'
                        }
                    ]
                }
            ]
        }
    })
}

// Test 8: Location Message
async function testLocation(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Location*\n\nSending location...')
    
    await session.client.message.send(chatJid, {
        locationMessage: {
            degreesLatitude: -6.200000,
            degreesLongitude: 106.816666,
            name: 'Jakarta, Indonesia',
            address: 'Capital City of Indonesia'
        }
    })
}

// Test 9: Contact vCard
async function testContact(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Contact*\n\nSending contact vCard...')
    
    const vcard = 
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        'FN:SBMgrup Bot\n' +
        'TEL;type=CELL;type=VOICE;waid=6281234567890:+62 812-3456-7890\n' +
        'END:VCARD'
    
    await session.client.message.send(chatJid, {
        contactMessage: {
            displayName: 'SBMgrup Bot',
            vcard: vcard
        }
    })
}

// Test 10: Poll Message
async function testPoll(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Poll*\n\nSending poll...')
    
    await session.client.message.send(chatJid, {
        type: 'poll',
        name: 'Which feature do you like most?',
        options: [
            'Auto-Response',
            'VoIP Calls',
            'Multi-Session',
            'Web Dashboard',
            'Auto-Update'
        ],
        selectableCount: 1
    })
}

// Test 5: Reaction (React to message) - OLD VERSION, REPLACED ABOVE
async function testReactionOld(ctx) {
    const { send } = ctx
    
    // Note: Zapo can RECEIVE reactions via message_addon event
    // but sending reactions requires protocol message
    // This is a placeholder - actual implementation needs protocol message
    
    await send(
        '*[+] Test: Reaction*\n\n' +
        'Note: Reactions are received via message_addon event.\n' +
        'Sending reactions requires protocol-level implementation.'
    )
}

// Run all tests sequentially
async function runAllTests(ctx) {
    const { send } = ctx
    
    await send('*[+] Running All Tests*\n\nStarting test suite...\n\n_Note: Some tests require specific conditions_')
    
    // Delay helper
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
    
    await testPlainText(ctx)
    await delay(2000)
    
    await testLinkPreview(ctx)
    await delay(2000)
    
    await testButton(ctx)
    await delay(2000)
    
    await testList(ctx)
    await delay(2000)
    
    await testLocation(ctx)
    await delay(2000)
    
    await testContact(ctx)
    await delay(2000)
    
    await testPoll(ctx)
    await delay(2000)
    
    await testImage(ctx)
    await delay(3000)
    
    await testDocument(ctx)
    await delay(2000)
    
    await testAudio(ctx)
    await delay(3000)
    
    await testViewOnce(ctx)
    await delay(2000)
    
    await testSticker(ctx)
    await delay(2000)
    
    if (ctx.event.key && ctx.event.message) {
        await testQuote(ctx)
        await delay(2000)
    } else {
        await send('*[~]* Skipped: Quote test (reply to a message to test)')
        await delay(1000)
    }
    
    if (ctx.isGroup) {
        await testMention(ctx)
        await delay(2000)
    } else {
        await send('*[~]* Skipped: Mention test (only works in groups)')
        await delay(1000)
    }
    
    if (ctx.event.key && ctx.event.message) {
        await testReaction(ctx)
        await delay(2000)
    } else {
        await send('*[~]* Skipped: Reaction test (reply to a message to test)')
        await delay(1000)
    }
    
    await send('*[✅] All Tests Complete!*\n\n_Video and voice note skipped in auto-run (too large)_')
}


// Note: Button and List responses are handled by CommandHandler
// When user clicks button/list, it comes back as buttonsResponseMessage or listResponseMessage
// The selectedId (buttonId or rowId) will be in the message

// Test 11: Image
async function testImage(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Image*\n\nDownloading and sending image...')
    
    try {
        const imageUrl = 'https://i.pinimg.com/736x/2f/ba/d0/2fbad0f048b7094f0cc93ce719d8ab54.jpg'
        
        // Download image using axios
        const axios = (await import('axios')).default
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
        })
        const imageBuffer = Buffer.from(response.data)
        
        // Send image with caption
        await session.client.message.send(chatJid, {
            type: 'image',
            media: imageBuffer,
            mimetype: 'image/jpeg',
            caption: '*Test Image*\n\nImage sent successfully! ✅'
        })
    } catch (error) {
        console.error('Image test error:', error)
        await send(`*[!]* Image test failed: ${error.message}`)
    }
}

// Test 12: Video
async function testVideo(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Video*\n\nDownloading and sending video...\n\n_This may take a moment..._')
    
    try {
        const videoUrl = 'https://archio.qzz.io/1769917909894-sdasedjiwef.mp4'
        
        // Download video using axios
        const axios = (await import('axios')).default
        const response = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 50 * 1024 * 1024 // 50MB max
        })
        const videoBuffer = Buffer.from(response.data)
        
        // Send video with caption
        await session.client.message.send(chatJid, {
            type: 'video',
            media: videoBuffer,
            mimetype: 'video/mp4',
            caption: '*Test Video*\n\nVideo sent successfully! ✅',
            gifPlayback: false
        })
    } catch (error) {
        console.error('Video test error:', error)
        await send(`*[!]* Video test failed: ${error.message}`)
    }
}

// Test 13: Audio
async function testAudio(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Audio*\n\nDownloading and sending audio...')
    
    try {
        const audioUrl = 'https://archio.qzz.io/1769917909894-sdasedjiwef.mp4'
        
        // Download audio using axios
        const axios = (await import('axios')).default
        const response = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        })
        const audioBuffer = Buffer.from(response.data)
        
        // Send audio (regular audio file)
        await session.client.message.send(chatJid, {
            type: 'audio',
            media: audioBuffer,
            mimetype: 'audio/mp4'
        })
        
        await send('*[+]* Audio sent successfully! ✅')
    } catch (error) {
        console.error('Audio test error:', error)
        await send(`*[!]* Audio test failed: ${error.message}`)
    }
}

// Test 14: Voice Note (PTT)
async function testVoiceNote(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Voice Note*\n\nDownloading and sending voice note...')
    
    try {
        const audioUrl = 'https://archio.qzz.io/1769917909894-sdasedjiwef.mp4'
        
        // Download audio using axios
        const axios = (await import('axios')).default
        const response = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        })
        const audioBuffer = Buffer.from(response.data)
        
        // Send as voice note (PTT - Push To Talk)
        await session.client.message.send(chatJid, {
            type: 'audio',
            media: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true // Push-to-talk (voice note)
        })
        
        await send('*[+]* Voice note sent successfully! ✅')
    } catch (error) {
        console.error('Voice note test error:', error)
        await send(`*[!]* Voice note test failed: ${error.message}`)
    }
}

// Test 15: Document
async function testDocument(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Document*\n\nSending test document...')
    
    try {
        // Create a simple text document
        const documentContent = `
╔════════════════════════════════╗
║     SBMgrup Bot Test File      ║
╚════════════════════════════════╝

This is a test document sent by the bot.

Features tested:
✅ Document upload
✅ Filename customization
✅ Caption support

Generated: ${new Date().toLocaleString()}

Thank you for testing!
        `.trim()
        
        const documentBuffer = Buffer.from(documentContent, 'utf-8')
        
        // Send document
        await session.client.message.send(chatJid, {
            type: 'document',
            media: documentBuffer,
            mimetype: 'text/plain',
            fileName: 'SBMgrup_Test_Document.txt',
            caption: '*Test Document*\n\nDocument sent successfully! ✅'
        })
    } catch (error) {
        console.error('Document test error:', error)
        await send(`*[!]* Document test failed: ${error.message}`)
    }
}

// Test 16: View Once Image
async function testViewOnce(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: View Once*\n\nSending view-once image...')
    
    try {
        const imageUrl = 'https://i.pinimg.com/736x/2f/ba/d0/2fbad0f048b7094f0cc93ce719d8ab54.jpg'
        
        // Download image using axios
        const axios = (await import('axios')).default
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
        })
        const imageBuffer = Buffer.from(response.data)
        
        // Send view-once image
        await session.client.message.send(chatJid, {
            type: 'image',
            media: imageBuffer,
            mimetype: 'image/jpeg',
            caption: '*View Once Test*\n\nThis image can only be viewed once! 👁️'
        }, {
            viewOnce: true
        })
    } catch (error) {
        console.error('View once test error:', error)
        await send(`*[!]* View once test failed: ${error.message}`)
    }
}

// Test 17: Sticker
async function testSticker(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Sticker*\n\nDownloading and converting to sticker...')
    
    try {
        const imageUrl = 'https://i.pinimg.com/736x/2f/ba/d0/2fbad0f048b7094f0cc93ce719d8ab54.jpg'
        
        // Download image using axios
        const axios = (await import('axios')).default
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
        })
        const imageBuffer = Buffer.from(response.data)
        
        // Send as sticker (using Zapo native processing)
        await session.client.message.send(chatJid, {
            type: 'sticker',
            media: imageBuffer,
            mimetype: 'image/webp'
        })
        
        await send('*[+]* Sticker sent successfully! ✅')
    } catch (error) {
        console.error('Sticker test error:', error)
        await send(`*[!]* Sticker test failed: ${error.message}`)
    }
}

