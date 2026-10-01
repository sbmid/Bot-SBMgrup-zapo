import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { uploadFile } from '../utils/uploader.js'
import { 
    initPureStatusDB, 
    createUpload, 
    getUploadByToken,
    getStats,
    getAllActiveUploads,
    deleteExpired,
    markAsDownloaded
} from '../database/purestatus.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = express.Router()

// Initialize DB
initPureStatusDB()

// Auto-cleanup scheduler (every 10 minutes)
setInterval(() => {
    const result = deleteExpired()
    if (result.deletedCount > 0) {
        console.log(`[PureStatus] Cleaned ${result.deletedCount} expired uploads`)
    }
}, 10 * 60 * 1000)

// Multer memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|mp4|mov|avi|mkv|webm/
        const ext = allowed.test(path.extname(file.originalname).toLowerCase())
        const mime = allowed.test(file.mimetype)
        ext && mime ? cb(null, true) : cb(new Error('Invalid file type'))
    }
})

// Homepage
router.get('/', async (req, res) => {
    const stats = getStats()
    
    // WhatsApp group URL (hardcoded)
    const groupUrl = 'https://chat.whatsapp.com/BEKkPVjJIQXBjlDdaT1uOL'
    
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PureStatus - HD Media Upload</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #fff;
            min-height: 100vh;
            padding: 16px;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #fff;
            padding: 24px;
            border: 1px solid #e5e7eb;
        }
        .header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        h1 {
            color: #111827;
            font-size: 1.75em;
            font-weight: 700;
            margin-bottom: 6px;
        }
        h1 i { color: #3b82f6; }
        .subtitle {
            color: #6b7280;
            font-size: 0.9em;
            margin-bottom: 12px;
        }
        .group-link {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            text-decoration: none;
            font-size: 0.85em;
            font-weight: 600;
            transition: 0.2s;
            margin-top: 8px;
        }
        .group-link:hover { background: #059669; }
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 24px;
        }
        .stat-item {
            text-align: center;
            padding: 14px 10px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
        }
        .stat-item .number {
            font-size: 1.3em;
            font-weight: 700;
            color: #111827;
        }
        .stat-item .label {
            font-size: 0.7em;
            color: #6b7280;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .upload-area {
            border: 2px dashed #d1d5db;
            padding: 32px 20px;
            text-align: center;
            cursor: pointer;
            transition: 0.2s;
            margin-bottom: 16px;
            background: #fafafa;
        }
        .upload-area:hover {
            border-color: #3b82f6;
            background: #f0f9ff;
        }
        .upload-area.dragover {
            border-color: #3b82f6;
            background: #eff6ff;
            border-style: solid;
        }
        .upload-icon {
            font-size: 2.5em;
            color: #3b82f6;
            margin-bottom: 10px;
        }
        .upload-area h3 {
            color: #111827;
            font-size: 1em;
            margin-bottom: 6px;
        }
        .upload-area p {
            color: #6b7280;
            font-size: 0.8em;
            margin: 3px 0;
        }
        input[type="file"] { display: none; }
        .upload-item {
            background: #fff;
            border: 1px solid #e5e7eb;
            padding: 14px;
            margin-bottom: 14px;
            display: none;
        }
        .upload-item.show { display: block; }
        .upload-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            gap: 10px;
        }
        .file-info {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            min-width: 0;
        }
        .file-icon {
            width: 36px;
            height: 36px;
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .file-icon i {
            font-size: 1.1em;
            color: #3b82f6;
        }
        .file-details {
            flex: 1;
            min-width: 0;
        }
        .file-name {
            font-size: 0.85em;
            font-weight: 600;
            color: #111827;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .file-size {
            font-size: 0.7em;
            color: #6b7280;
            margin-top: 2px;
        }
        .progress-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .progress-bar-wrapper {
            flex: 1;
            height: 4px;
            background: #f3f4f6;
            overflow: hidden;
        }
        .progress-bar {
            height: 100%;
            background: #3b82f6;
            width: 0%;
            transition: width 0.3s;
        }
        .progress-bar.success { background: #10b981; }
        .progress-percent {
            font-size: 0.8em;
            font-weight: 600;
            color: #111827;
            min-width: 36px;
            text-align: right;
        }
        .result {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
            padding: 20px;
            margin-top: 16px;
            display: none;
        }
        .result.show { display: block; }
        .result h3 {
            text-align: center;
            margin-bottom: 14px;
            font-size: 1.1em;
        }
        .token {
            font-size: 1.6em;
            font-weight: 700;
            text-align: center;
            color: #111827;
            margin: 14px 0;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
            background: #fff;
            padding: 14px;
            border: 2px solid #166534;
        }
        .btn {
            width: 100%;
            padding: 11px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            transition: 0.2s;
        }
        .btn-primary {
            background: #111827;
            color: #fff;
        }
        .btn-primary:hover { background: #1f2937; }
        .btn-success {
            background: #166534;
            color: #fff;
        }
        .btn-success:hover { background: #15803d; }
        .instructions {
            background: #fff;
            border: 1px solid #d1d5db;
            padding: 14px;
            margin-top: 14px;
            font-size: 0.8em;
            color: #374151;
            line-height: 1.6;
        }
        .instructions strong { color: #111827; }
        .instructions code {
            background: #f3f4f6;
            padding: 2px 5px;
            font-family: monospace;
            color: #3b82f6;
        }
        @media (max-width: 640px) {
            body { padding: 8px; }
            .container { margin: 10px auto; padding: 16px; }
            h1 { font-size: 1.5em; }
            .stats { gap: 8px; }
            .stat-item { padding: 10px 6px; }
            .stat-item .number { font-size: 1.1em; }
            .token { font-size: 1.3em; letter-spacing: 2px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-cloud-upload-alt"></i> PureStatus</h1>
            <p class="subtitle">Upload HD Media for WhatsApp Status/Member</p>
            ${groupUrl ? `<a href="${groupUrl}" target="_blank" class="group-link"><i class="fab fa-whatsapp"></i> Join Our Group</a>` : ''}
        </div>
        
        <div class="stats">
            <div class="stat-item">
                <div class="number">${stats.globalUploads}</div>
                <div class="label">Total Upload</div>
            </div>
            <div class="stat-item">
                <div class="number">${stats.globalDownloads}</div>
                <div class="label">Downloaded</div>
            </div>
            <div class="stat-item">
                <div class="number">${Math.round(stats.accumulatedSize / 1024 / 1024)}MB</div>
                <div class="label">Acc. Size</div>
            </div>
        </div>
        
        <form id="uploadForm">
            <div class="upload-area" id="uploadArea">
                <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                <h3>Click or drag files here</h3>
                <p>Support: Image (JPG, PNG, GIF) & Video (MP4, MOV, AVI, MKV, WEBM)</p>
                <p>Max: 500MB</p>
                <input type="file" id="fileInput" accept="image/*,video/*" required>
            </div>
            
            <div class="upload-item" id="uploadItem">
                <div class="upload-header">
                    <div class="file-info">
                        <div class="file-icon"><i class="fas fa-file" id="fileIcon"></i></div>
                        <div class="file-details">
                            <div class="file-name" id="fileName"></div>
                            <div class="file-size" id="fileSize"></div>
                        </div>
                    </div>
                </div>
                <div class="progress-container">
                    <div class="progress-bar-wrapper">
                        <div class="progress-bar" id="progressBar"></div>
                    </div>
                    <div class="progress-percent" id="progressPercent">0%</div>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary" id="uploadBtn">
                <i class="fas fa-upload"></i> Upload File
            </button>
        </form>
        
        <div class="result" id="result">
            <h3><i class="fas fa-check-circle"></i> Upload Success!</h3>
            <p style="text-align: center; margin-bottom: 8px; font-weight: 600;">Your Token:</p>
            <div class="token" id="token"></div>
            <button class="btn btn-success" onclick="copyToken()">
                <i class="fas fa-copy"></i> Copy Token
            </button>
            <div class="instructions">
                <strong>How to use:</strong><br>
                1. Copy token di atas<br>
                2. Buka WhatsApp bot<br>
                3. Ketik: <code>.getpure TOKEN</code><br>
                4. Pilih mode kompresi (80%, Original, Smart)<br>
                5. Bot akan kirim file ke kamu!<br><br>
                <strong>⏱️ Expires:</strong> 1 hour
            </div>
        </div>
    </div>
    
    <script>
        console.log('[PureStatus] Script loaded');
        
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadForm = document.getElementById('uploadForm');
        const uploadBtn = document.getElementById('uploadBtn');
        const uploadItem = document.getElementById('uploadItem');
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const result = document.getElementById('result');
        let dragCounter = 0;
        
        console.log('[PureStatus] Elements:', {
            uploadArea: !!uploadArea,
            fileInput: !!fileInput,
            uploadForm: !!uploadForm,
            uploadBtn: !!uploadBtn
        });
        
        uploadArea.addEventListener('click', () => {
            console.log('[PureStatus] Upload area clicked');
            fileInput.click();
        });
        
        uploadArea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            uploadArea.classList.add('dragover');
            console.log('[PureStatus] Drag enter, counter:', dragCounter);
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            console.log('[PureStatus] Drag leave, counter:', dragCounter);
            if (dragCounter === 0) uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            uploadArea.classList.remove('dragover');
            console.log('[PureStatus] File dropped, files:', e.dataTransfer.files.length);
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                
                // Hide upload area
                uploadArea.style.display = 'none';
                console.log('[PureStatus] Upload area hidden');
                
                updateFileInfo();
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            console.log('[PureStatus] File input changed, files:', e.target.files.length);
            if (e.target.files.length) {
                // Hide upload area
                uploadArea.style.display = 'none';
                console.log('[PureStatus] Upload area hidden');
            }
            updateFileInfo();
        });
        
        function updateFileInfo() {
            console.log('[PureStatus] updateFileInfo called');
            if (fileInput.files.length) {
                const file = fileInput.files[0];
                console.log('[PureStatus] File selected:', {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
                
                // Update file details
                const fileNameEl = document.getElementById('fileName');
                const fileSizeEl = document.getElementById('fileSize');
                const fileIconEl = document.getElementById('fileIcon');
                
                console.log('[PureStatus] Elements check:', {
                    fileName: !!fileNameEl,
                    fileSize: !!fileSizeEl,
                    fileIcon: !!fileIconEl
                });
                
                if (fileNameEl) fileNameEl.textContent = file.name;
                if (fileSizeEl) fileSizeEl.textContent = formatBytes(file.size);
                if (fileIconEl) {
                    const icon = file.type.startsWith('image') ? 'fa-image' : 'fa-video';
                    fileIconEl.className = 'fas ' + icon;
                }
                
                // Show upload item preview
                uploadItem.classList.add('show');
                console.log('[PureStatus] Upload item shown');
                
                // Enable upload button
                uploadBtn.disabled = false;
                console.log('[PureStatus] Upload button enabled');
            }
        }
        
        function formatBytes(bytes) {
            if (!bytes) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
        }
        
        uploadForm.addEventListener('submit', async (e) => {
            console.log('[PureStatus] ========== FORM SUBMIT START ==========');
            e.preventDefault();
            console.log('[PureStatus] Form submitted, default prevented');
            
            if (!fileInput.files.length) {
                console.error('[PureStatus] No file selected!');
                alert('Please select a file first!');
                return;
            }
            
            const file = fileInput.files[0];
            console.log('[PureStatus] Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
            
            const formData = new FormData();
            formData.append('file', file);
            console.log('[PureStatus] FormData created');
            
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            console.log('[PureStatus] Button disabled and text changed');
            
            uploadItem.classList.add('show');
            console.log('[PureStatus] Upload item should be visible');
            console.log('[PureStatus] Upload UI updated, starting XHR...');
            
            const xhr = new XMLHttpRequest();
            console.log('[PureStatus] XHR object created');
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = percent + '%';
                    progressPercent.textContent = percent + '%';
                    console.log('[PureStatus] Upload progress:', percent + '%', 'Loaded:', e.loaded, 'Total:', e.total);
                }
            });
            console.log('[PureStatus] Progress listener attached');
            
            xhr.addEventListener('load', () => {
                console.log('[PureStatus] ========== XHR LOAD EVENT ==========');
                console.log('[PureStatus] XHR load event, status:', xhr.status);
                console.log('[PureStatus] Response text:', xhr.responseText);
                console.log('[PureStatus] Response headers:', xhr.getAllResponseHeaders());
                
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        console.log('[PureStatus] Parsed response:', data);
                        console.log('[PureStatus] Upload success! Token:', data.token);
                        progressBar.classList.add('success');
                        progressBar.style.width = '100%';
                        progressPercent.textContent = '100%';
                        
                        setTimeout(() => {
                            document.getElementById('token').textContent = data.token;
                            result.classList.add('show');
                            uploadForm.style.display = 'none';
                            console.log('[PureStatus] Result displayed');
                        }, 500);
                    } catch (err) {
                        console.error('[PureStatus] JSON parse error:', err);
                        alert('Upload success but failed to parse response');
                        resetUI();
                    }
                } else {
                    console.error('[PureStatus] Upload failed with status:', xhr.status);
                    console.error('[PureStatus] Error response:', xhr.responseText);
                    alert('Upload failed (Status ' + xhr.status + '): ' + xhr.responseText);
                    resetUI();
                }
            });
            console.log('[PureStatus] Load listener attached');
            
            xhr.addEventListener('error', (e) => {
                console.error('[PureStatus] ========== XHR ERROR ==========');
                console.error('[PureStatus] XHR error event:', e);
                console.error('[PureStatus] XHR status:', xhr.status);
                console.error('[PureStatus] XHR readyState:', xhr.readyState);
                alert('Upload failed. Network error. Check console for details.');
                resetUI();
            });
            console.log('[PureStatus] Error listener attached');
            
            xhr.addEventListener('abort', () => {
                console.log('[PureStatus] XHR aborted');
            });
            console.log('[PureStatus] Abort listener attached');
            
            console.log('[PureStatus] Opening XHR connection to: POST /upload');
            xhr.open('POST', '/upload');
            console.log('[PureStatus] XHR connection opened');
            
            console.log('[PureStatus] Sending FormData... File size:', file.size, 'bytes');
            xhr.send(formData);
            console.log('[PureStatus] FormData sent! Waiting for response...');
            console.log('[PureStatus] ========== WAITING FOR UPLOAD ==========');
        });
        
        function resetUI() {
            console.log('[PureStatus] Resetting UI');
            uploadArea.style.display = 'block';
            uploadItem.classList.remove('show');
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload File';
            progressBar.style.width = '0%';
            progressBar.classList.remove('success');
            progressPercent.textContent = '0%';
            fileInput.value = '';
        }
        
        function copyToken() {
            const token = document.getElementById('token').textContent;
            console.log('[PureStatus] Copying token:', token);
            navigator.clipboard.writeText(token).then(() => {
                const btn = event.target;
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => btn.innerHTML = original, 2000);
                console.log('[PureStatus] Token copied to clipboard');
            }).catch(err => {
                console.error('[PureStatus] Clipboard error:', err);
                alert('Failed to copy. Token: ' + token);
            });
        }
        
        console.log('[PureStatus] All event listeners attached');
        
        // Also add direct click listener to button for debugging
        uploadBtn.addEventListener('click', (e) => {
            console.log('[PureStatus] ========== BUTTON CLICKED ==========');
            console.log('[PureStatus] Button click event fired');
            console.log('[PureStatus] Button type:', uploadBtn.type);
            console.log('[PureStatus] Button disabled:', uploadBtn.disabled);
            console.log('[PureStatus] File input has files:', fileInput.files.length);
        });
        
        // Test button click manually
        window.testUpload = function() {
            console.log('[PureStatus] TEST: Manual upload triggered');
            uploadForm.dispatchEvent(new Event('submit'));
        };
        console.log('[PureStatus] You can test upload by typing: testUpload() in console');
        
        // Log button state
        console.log('[PureStatus] Upload button state:', {
            disabled: uploadBtn.disabled,
            display: window.getComputedStyle(uploadBtn).display,
            visibility: window.getComputedStyle(uploadBtn).visibility,
            pointerEvents: window.getComputedStyle(uploadBtn).pointerEvents,
            zIndex: window.getComputedStyle(uploadBtn).zIndex
        });
    </script>
</body>
</html>`)
})

// Upload API
router.post('/upload', upload.single('file'), async (req, res) => {
    console.log('[PureStatus] Upload request received')
    console.log('[PureStatus] Request body:', req.body)
    console.log('[PureStatus] Request file:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
    } : 'NO FILE')
    
    try {
        if (!req.file) {
            console.error('[PureStatus] No file in request')
            return res.status(400).json({ error: 'No file uploaded' })
        }
        
        console.log('[PureStatus] Uploading to cloud...')
        const fileUrl = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)
        console.log('[PureStatus] Cloud upload success:', fileUrl)
        
        console.log('[PureStatus] Creating database entry...')
        const token = createUpload({
            url: fileUrl,
            originalName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            resolution: null,
            duration: null
        })
        console.log('[PureStatus] Token generated:', token)
        
        res.json({
            success: true,
            token,
            url: fileUrl,
            message: 'File uploaded successfully',
            expiresIn: '1 hour'
        })
        
    } catch (error) {
        console.error('[PureStatus] Upload error:', error)
        console.error('[PureStatus] Error stack:', error.stack)
        res.status(500).json({ error: error.message })
    }
})

// Get file info by token
router.get('/api/file/:token', (req, res) => {
    try {
        const upload = getUploadByToken(req.params.token)
        
        if (!upload) {
            return res.status(404).json({ error: 'Token not found or expired' })
        }
        
        if (upload.expires_at < Date.now()) {
            return res.status(410).json({ error: 'Token expired' })
        }
        
        res.json({
            success: true,
            data: {
                token: upload.token,
                url: upload.url,
                originalName: upload.original_name,
                fileType: upload.file_type,
                fileSize: upload.file_size,
                resolution: upload.resolution,
                duration: upload.duration,
                createdAt: upload.created_at,
                expiresAt: upload.expires_at
            }
        })
        
    } catch (error) {
        console.error('[PureStatus] Get file error:', error)
        res.status(500).json({ error: error.message })
    }
})

// Get all active files
router.get('/api/files/active', (req, res) => {
    try {
        const uploads = getAllActiveUploads()
        res.json({
            success: true,
            count: uploads.length,
            files: uploads.map(u => ({
                token: u.token,
                url: u.url,
                originalName: u.original_name,
                fileType: u.file_type,
                fileSize: u.file_size,
                createdAt: u.created_at,
                expiresAt: u.expires_at
            }))
        })
    } catch (error) {
        console.error('[PureStatus] Get active files error:', error)
        res.status(500).json({ error: error.message })
    }
})

// Mark as downloaded
router.post('/api/file/:token/downloaded', (req, res) => {
    try {
        const { downloadedBy } = req.body
        markAsDownloaded(req.params.token, downloadedBy || 'unknown')
        res.json({ success: true, message: 'Marked as downloaded' })
    } catch (error) {
        console.error('[PureStatus] Mark downloaded error:', error)
        res.status(500).json({ error: error.message })
    }
})

export default router
