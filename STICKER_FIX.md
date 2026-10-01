# 🎨 Sticker Transparency Fix

## Masalah
Semua sticker yang dibuat (`.sticker`, `.brat`, `.bratgif`, `.attp`) menghasilkan sticker dengan **background transparan**, yang membuat sticker terlihat tidak jelas di WhatsApp.

## Penyebab
Zapo's `@zapo-js/media-utils` melakukan auto-convert image/GIF → WebP dengan **transparansi default**. Buffer langsung dikirim tanpa processing background.

## Solusi
Implementasi dari analisa repo RTXZY-MD:
1. Install `wa-sticker-formatter` - Library yang sama dipakai RTXZY-MD
2. Install `sharp` - Untuk fallback image processing
3. Buat utility helper (`src/utils/stickerHelper.js`) untuk process sticker
4. Update semua command sticker untuk pakai helper

## File yang Diubah

### 1. `package.json`
```diff
+ "sharp": "^0.33.0",
+ "wa-sticker-formatter": "^4.4.4",
```

### 2. `src/utils/stickerHelper.js` (BARU)
Helper functions:
- `processImageToSticker()` - Process image dengan background putih
- `processVideoToSticker()` - Process GIF/video animasi
- `addStickerMetadata()` - Add EXIF metadata (packname/author)

### 3. Command Updates
- ✅ `src/commands/sticker/sticker.js` - Fix image & video sticker
- ✅ `src/commands/sticker/brat.js` - Fix brat sticker
- ✅ `src/commands/sticker/bratgif.js` - Fix animated brat
- ✅ `src/commands/sticker/attp.js` - Fix animated text
- ✅ `src/commands/sticker/wm.js` - Proper EXIF metadata

## Cara Install

```bash
npm install
```

Dependencies baru akan auto-install:
- `wa-sticker-formatter@^4.4.4`
- `sharp@^0.33.0`

## Testing

Test setiap command:
```
.sticker (reply ke image/video)
.brat hello world
.bratgif test animation
.attp hello
.wm NewPack|Author (reply ke sticker)
```

Sticker sekarang akan punya **background putih** yang solid, bukan transparan.

## Technical Details

### wa-sticker-formatter Options
```javascript
{
    pack: 'SBMgrup',           // Pack name
    author: 'Bot',              // Author name
    type: 'full',               // 'full' | 'crop' | 'circle'
    quality: 50,                // 1-100
    background: '#FFFFFF'       // Background color (fix transparansi)
}
```

### Fallback Strategy
1. Try `wa-sticker-formatter` first (sama seperti RTXZY-MD)
2. Fallback ke `sharp` dengan background putih
3. Last resort: Zapo auto-convert (original behavior)

## Referensi
- RTXZY-MD repo: https://github.com/BOTCAHX/RTXZY-MD (branch zapo)
- File: `lib/sticker.js` - Multi-fallback sticker processing
- File: `lib/simple.js` - sendImageAsSticker & sendVideoAsSticker helpers
