const express = require('express');
// Menggunakan fork yang lebih stabil untuk menghindari error 410/403
const ytdl = require('@distube/ytdl-core'); 
const app = express();

// Middleware untuk memparsing data dari form (body)
app.use(express.urlencoded({ extended: true }));

// =================================================================
// TANGANI COOKIE & PLAYER CLIENT (UNTUK MENGATASI PEMBLOKIRAN BOT)
// Gunakan variabel lingkungan 'YOUTUBE_COOKIES' di Vercel (opsional tapi disarankan!)
// =================================================================
const COOKIES = process.env.YOUTUBE_COOKIES || '';
const requestOptions = COOKIES ? { headers: { 'Cookie': COOKIES } } : {};

const clientOptions = {
    // Klien ini cenderung lebih tidak diblokir oleh YouTube
    playerClients: ['ANDROID', 'TV', 'WEB_EMBEDDED', 'IOS'],
    requestOptions: requestOptions // Gabungkan dengan cookie
};
// =================================================================


// =================================================================
// ENDPOINT UTAMA (FORM HTML)
// =================================================================
// Letakkan endpoint di root untuk serverless function Vercel
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Downloader</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" xintegrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        body {
            background: linear-gradient(135deg, #1d2b64 0%, #f8cdda 100%);
            min-height: 100vh;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 1.25rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.3);
        }
        .form-control::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        .input-group .form-control, .input-group .form-select {
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
        }
        .form-select option {
            background: #2c3e50;
            color: white;
        }
        /* Memastikan div resolusi selalu terlihat baik saat muncul */
        #resolutionDiv {
             /* Menggunakan flex agar sejajar dengan input group */
            display: none; 
        }
    </style>
</head>
<body class="d-flex align-items-center justify-content-center px-3">
    <div class="col-11 col-md-8 col-lg-6 col-xl-5">
        <div class="card glass-card text-white border-0">
            <div class="card-body p-4 p-lg-5 text-center">
                <i class="bi bi-youtube display-4 mb-3 text-danger"></i>
                <h1 class="fw-bold mb-3">YouTube Downloader</h1>
                <p class="mb-4">Tempelkan link video YouTube untuk memulai.</p>
                <form action="/api/downloader" method="POST">
                    <div class="input-group input-group-lg mb-4">
                        <span class="input-group-text bg-transparent border-end-0">
                            <i class="bi bi-link-45deg text-white"></i>
                        </span>
                        <input type="url" name="youtubeUrl" class="form-control border-start-0" placeholder="https://www.youtube.com/watch?v=..." required>
                    </div>
                    
                    <div class="input-group input-group-lg mb-3">
                        <select name="format" class="form-select" id="formatSelect" required>
                            <option value="mp4" selected>MP4 (Video)</option>
                            <option value="mp3">MP3 (Audio)</option>
                        </select>
                    </div>
                    
                    <div class="input-group input-group-lg" id="resolutionDiv">
                        <select name="resolution" class="form-select">
                            <option value="highestvideo" selected>Kualitas Video Terbaik</option>
                            <!-- Opsi resolusi tetap ditampilkan sebagai pilihan tambahan,
                                 meskipun ytdl-core akan memilih format video terbaik -->
                            <option value="1080">1080p</option>
                            <option value="720">720p</option>
                            <option value="480">480p</option>
                            <option value="360">360p</option>
                        </select>
                    </div>

                    <div class="d-grid">
                        <button class="btn btn-danger fw-bold btn-lg mt-3" type="submit">Download</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" xintegrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
    <script> 
        // Logika untuk menyembunyikan/menampilkan pilihan resolusi
        document.getElementById('formatSelect').addEventListener('change', function() {
            // Tampilkan resolusi hanya jika formatnya adalah MP4
            document.getElementById('resolutionDiv').style.display = this.value === 'mp4' ? 'flex' : 'none';
        });
        // Panggil saat load untuk mengatur status awal
        document.getElementById('formatSelect').dispatchEvent(new Event('change'));
    </script>
</body>
</html>
`);
});

// =================================================================
// ENDPOINT DOWNLOAD (STREAMING LANGSUNG)
// =================================================================
app.post('/api/downloader', async (req, res) => {
    const { youtubeUrl, format, resolution } = req.body;

    if (!ytdl.validateURL(youtubeUrl)) {
        return res.status(400).send('URL YouTube tidak valid.');
    }

    try {
        // 1. Ambil informasi video untuk mendapatkan judul
        let info;
        try {
            // TERAPKAN OPSI CLIENT DAN COOKIE
            info = await ytdl.getInfo(youtubeUrl, clientOptions);
        } catch (err) {
            console.error('[YTDL GetInfo Error]:', err.message);
            // Tangani error 410/403/404 yang sering terjadi
            if (err.statusCode === 410 || err.statusCode === 403 || err.statusCode === 404 || err.message.includes('UnrecoverableError')) {
                 return res.status(500).send(`
                    <h2 style="color:red;">GAGAL MENGAMBIL INFO VIDEO</h2>
                    <p>Status code: ${err.statusCode || 'N/A'}. YouTube mungkin memblokir permintaan ini. Coba URL video lain atau pastikan **YOUTUBE_COOKIES** valid.</p>
                    <a href="/">Coba Lagi</a>
                `);
            }
            throw err; 
        }

        // Sanitasi Judul
        const title = info.videoDetails.title
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '_'); // Ganti spasi dengan underscore untuk nama file

        let filename;
        let contentType;

        // Gunakan clientOptions sebagai dasar ytdlOptions
        let ytdlOptions = { ...clientOptions };

        // 2. Tentukan format dan opsi ytdl-core
        if (format === 'mp4') {
            filename = `${title}.mp4`;
            contentType = 'video/mp4';
            
            // Logika Resolusi
            // Untuk mp4, kita gunakan filter dan gabungkan audio/video
            ytdlOptions.filter = 'videoandaudio';
            // resolution akan menentukan kualitas (highestvideo adalah default terbaik)
            ytdlOptions.quality = resolution === 'highestvideo' ? 'highestvideo' : resolution;

        } else { // format === 'mp3'
            filename = `${title}.mp3`;
            contentType = 'audio/mpeg';
            // Filter hanya audio dengan kualitas tertinggi
            ytdlOptions.filter = 'audioonly';
            ytdlOptions.quality = 'highestaudio';
        }

        // 3. Atur Header Respon untuk Download dan Streaming
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        res.header('Content-Type', contentType);
        res.header('Transfer-Encoding', 'chunked');

        // 4. Stream Data Video/Audio Langsung ke Klien
        const downloadStream = ytdl(youtubeUrl, ytdlOptions);

        downloadStream.on('error', (err) => {
            console.error('[YTDL Stream Error]:', err.message);
            if (!res.headersSent) {
                res.status(500).send(`
                    <h2 style="color:red;">STREAMING GAGAL</h2>
                    <p>Gagal memproses video: ${err.message}.</p>
                    <a href="/">Coba Lagi</a>
                `);
            } else {
                res.end();
            }
        });

        // Pipe stream download ke response Express (streaming langsung)
        downloadStream.pipe(res);

    } catch (error) {
        console.error(`[Fatal Server Error]: ${error.message}`);
        res.status(500).send(`
            <h2 style="color:red;">INTERNAL SERVER ERROR (FATAL)</h2>
            <p>Gagal memproses permintaan: ${error.message}</p>
            <a href="/">Coba Lagi</a>
        `);
    }
});

// Export Express app untuk Vercel Serverless Function
// Vercel akan otomatis mengenali ini sebagai Serverless Function
module.exports = app;
