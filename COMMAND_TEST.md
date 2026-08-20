# Test Command Documentation

Command `.test` untuk testing semua message types yang didukung oleh Zapo-JS.

## Usage

```
.test <type>
```

## Available Test Types

### 1. **Text Message**
```
.test text
```
Mengirim plain text message sederhana.

---

### 2. **Link Preview**
```
.test link
```
Mengirim extended text message dengan link preview (preview otomatis muncul di WhatsApp).

**Example Output:**
- Title: "Zapo - WhatsApp Web Protocol"
- Description: "High-performance WhatsApp Web implementation in TypeScript"
- Link: https://github.com/vinikjkkj/zapo

---

### 3. **Quote/Reply**
```
.test quote
```
**Requirements:** Reply to a message

Bot akan reply dengan quote message (menampilkan message yang di-reply).

---

### 4. **Mention**
```
.test mention
```
**Requirements:** Harus di group chat

Bot akan mention user yang kirim command.

**Note:** Handle LID users dengan `participantAlt`.

---

### 5. **Button Message** ⭐ NEW!
```
.test button
```
Mengirim quick reply button dengan 3 pilihan:
- 📋 Menu
- ❓ Help
- ℹ️ Info

**Technical:**
```javascript
buttonsMessage: {
  contentText: 'Welcome to SBMgrup Bot!',
  footerText: 'Powered by Zapo-JS',
  headerType: TEXT,
  text: 'Choose an option below:',
  buttons: [...]
}
```

**Button Response:**
Ketika user click button, WhatsApp kirim `buttonsResponseMessage` dengan `selectedButtonId` yang bisa di-handle untuk trigger action.

---

### 6. **List Message** ⭐ NEW!
```
.test list
```
Mengirim dropdown menu dengan beberapa kategori:

**Categories:**
1. **General Commands**
   - Menu
   - Ping
   - Info

2. **Owner Commands**
   - Update
   - Restart

**Technical:**
```javascript
listMessage: {
  title: 'Bot Commands',
  buttonText: 'Open Menu',
  sections: [...]
}
```

**List Response:**
Ketika user pilih item, WhatsApp kirim `listResponseMessage` dengan `selectedRowId`.

---

### 7. **Location** ⭐ NEW!
```
.test location
```
Mengirim location message (Jakarta, Indonesia).

**Technical:**
```javascript
locationMessage: {
  degreesLatitude: -6.200000,
  degreesLongitude: 106.816666,
  name: 'Jakarta, Indonesia',
  address: 'Capital City of Indonesia'
}
```

**Use Cases:**
- Share meeting location
- Store location
- Event location

---

### 8. **Contact vCard** ⭐ NEW!
```
.test contact
```
Mengirim contact card dalam format vCard.

**Technical:**
```javascript
contactMessage: {
  displayName: 'SBMgrup Bot',
  vcard: 'BEGIN:VCARD\n...\nEND:VCARD'
}
```

**Use Cases:**
- Share customer service contact
- Business contact
- Team member contact

---

### 9. **Reaction** ⭐ NEW!
```
.test react
```
**Requirements:** Reply to a message

Bot akan react dengan emoji 👍 ke message yang di-reply.

**Technical:**
```javascript
{
  type: 'reaction',
  target: event,
  emoji: '👍'
}
```

**Supported Emojis:**
- All Unicode emojis
- Empty string = remove reaction

---

### 10. **Poll** ⭐ NEW!
```
.test poll
```
Mengirim poll message dengan pilihan multiple.

**Question:** "Which feature do you like most?"

**Options:**
1. Auto-Response
2. VoIP Calls
3. Multi-Session
4. Web Dashboard
5. Auto-Update

**Technical:**
```javascript
{
  type: 'poll',
  name: 'Question text',
  options: ['Option 1', 'Option 2', ...],
  selectableCount: 1
}
```

**Settings:**
- `selectableCount: 1` = single choice
- `selectableCount: 0` = multiple choice

---

### 11. **Run All Tests**
```
.test all
```
Menjalankan semua test secara sequential dengan delay 2 detik antar test.

**Tests Run:**
1. ✅ Plain text
2. ✅ Link preview
3. ✅ Button message
4. ✅ List message
5. ✅ Location
6. ✅ Contact
7. ✅ Poll
8. 🔄 Quote (if replying)
9. 🔄 Mention (if in group)
10. 🔄 Reaction (if replying)

**Duration:** ~20-25 seconds total

---

## Response Handling

### Button Response
```javascript
// When user clicks button
event.message.buttonsResponseMessage.selectedButtonId
// Returns: 'btn_menu', 'btn_help', or 'btn_info'
```

### List Response
```javascript
// When user selects list item
event.message.listResponseMessage.singleSelectReply.selectedRowId
// Returns: 'row_menu', 'row_ping', 'row_update', etc.
```

### Poll Vote
```javascript
// When user votes on poll
event.message_addon // Separate event type
// Contains: pollUpdateMessage with vote data
```

---

## Technical Notes

### Proto Import
```javascript
import { proto } from 'zapo-js'
```

Required for:
- `proto.Message.ButtonsMessage.HeaderType.TEXT`
- `proto.Message.ButtonsMessage.Button.Type.RESPONSE`
- `proto.Message.ListMessage.ListType.SINGLE_SELECT`

### Message Types Reference

| Type | Field Name | Zapo Type |
|------|-----------|-----------|
| Button | `buttonsMessage` | `button` |
| Button Response | `buttonsResponseMessage` | `button_response` |
| List | `listMessage` | `list` |
| List Response | `listResponseMessage` | `list_response` |
| Poll | `pollCreationMessage` | `poll` |
| Location | `locationMessage` | `location` |
| Contact | `contactMessage` | `contact` |
| Reaction | `reactionMessage` | `reaction` |

---

## Use Cases

### Customer Service Bot
```
Button: [Track Order] [Cancel Order] [Help]
```

### Restaurant Order Bot
```
List: Menu Categories → Menu Items → Add to Cart
```

### Event Registration
```
Poll: "Which date works for you?"
Location: Event venue
Contact: Organizer contact
```

### Store Bot
```
Button: [Check Stock] [Order] [Location]
Auto-Response: product names → details
```

---

## Limitations

### WhatsApp Protocol
1. ❌ Cannot edit other users' messages
2. ❌ Cannot manipulate message content after sent
3. ✅ Can revoke own messages (delete for everyone)
4. ✅ Admin can revoke member messages in groups

### Button Limits
- Max 3 buttons per message
- Max 1024 chars per button text
- Button ID max 256 chars

### List Limits
- Max 10 sections
- Max 10 rows per section
- Max 100 total rows

### Poll Limits
- Max 12 options
- Max 100 chars per option
- Cannot edit poll after sending

---

## Error Handling

All tests include try-catch blocks. Errors will show:
```
[!] Test failed: <error message>
```

Common errors:
- **Proto not imported** → Missing `import { proto }`
- **Invalid JID** → Check chat/sender JID format
- **Message too long** → Reduce text length
- **Rate limit** → Too many messages, slow down

---

## Future Enhancements

Potential additions:
- [ ] Image with button
- [ ] Video with button
- [ ] Document message
- [ ] Sticker message
- [ ] Audio message
- [ ] Template messages
- [ ] Native flow (interactive)
- [ ] Order message
- [ ] Product message

---

## Examples

### Quick Test
```
User: .test button
Bot: [Sends button message with 3 options]
```

### Full Suite
```
User: .test all
Bot: [Sends 10 different message types with 2s delay]
```

### Conditional Test
```
User: .test quote (without replying)
Bot: [!] Reply to a message to test quote feature
```

---

## Related Commands

- `.menu` - Show all commands
- `.info` - Bot information
- `.ping` - Check latency
- `.ai <query>` - AI chat (uses text)
- `.imagine <prompt>` - AI image (uses image message)

---

**Last Updated:** 2026-08-20  
**Zapo Version:** 1.x  
**Bot Version:** SBMgrup v1.0
