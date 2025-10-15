const express = require('express');
// Menggunakan library ytdl-core yang stabil untuk streaming download
const ytdl = require('@distube/ytdl-core'); 

const app = express();
// Server akan berjalan di port 3000 secara default, atau dari variabel lingkungan PORT
const PORT = process.env.PORT || 3000; 

// Middleware untuk memparsing data dari form (body)
app.use(express.urlencoded({ extended: true }));

// =================================================================
// KONFIGURASI YTDL CORE (Opsional: untuk mitigasi pemblokiran bot)
// =================================================================
// Gunakan variabel lingkungan YOUTUBE_COOKIES jika tersedia
const COOKIES = process.env.YOUTUBE_COOKIES || ''; 
const requestOptions = COOKIES ? { headers: { 'Cookie': COOKIES } } : {};

const clientOptions = {
    // Klien yang berbeda untuk meniru permintaan non-web
    playerClients: ['ANDROID', 'TV', 'WEB_EMBEDDED', 'IOS'],
    requestOptions: requestOptions 
};
// =================================================================

// =================================================================
// ENDPOINT UTAMA (Menampilkan Form HTML)
// =================================================================
app.get('/', (req, res) => {
    // Tampilan HTML (tidak diubah sesuai permintaan)
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
        #resolutionDiv {
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
                <form action="/download" method="POST">
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
                    
                    <!-- Pilihan Resolusi -->
                    <div class="input-group input-group-lg" id="resolutionDiv">
                        <select name="resolution" class="form-select">
                            <option value="highestvideo" selected>Kualitas Video Terbaik (Gabungan Audio/Video)</option>
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
            document.getElementById('resolutionDiv').style.display = this.value === 'mp4' ? 'flex' : 'none';
        });
        document.getElementById('formatSelect').dispatchEvent(new Event('change'));
    </script>
</body>
</html>
`);
});

// =================================================================
// ENDPOINT DOWNLOAD (Streaming Langsung ke Klien)
// =================================================================
app.post('/download', async (req, res) => {
    const { youtubeUrl, format, resolution } = req.body;

    // 1. Validasi URL
    if (!ytdl.validateURL(youtubeUrl)) {
        return res.status(400).send('URL YouTube tidak valid.');
    }

    try {
        // 2. Ambil informasi video untuk judul
        let info;
        try {
            info = await ytdl.getInfo(youtubeUrl, clientOptions);
        } catch (err) {
            console.error('[YTDL GetInfo Error]:', err.message);
            // Tangani error pemblokiran atau video dihapus (410, 403, dll)
            if (err.statusCode === 410 || err.statusCode === 403 || err.statusCode === 404 || err.message.includes('UnrecoverableError')) {
                 return res.status(500).send(`
                    <h2 style="color:red;">GAGAL MENGAMBIL INFO VIDEO</h2>
                    <p>YouTube mungkin memblokir permintaan ini atau video telah dihapus.</p>
                    <a href="/">Coba Lagi</a>
                `);
            }
            throw err; 
        }

        // 3. Sanitasi dan Buat Judul File
        const title = info.videoDetails.title
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '_'); 

        let filename;
        let contentType;
        let ytdlOptions = { ...clientOptions };

        // 4. Konfigurasi Opsi Download berdasarkan Format
        if (format === 'mp4') {
            filename = `${title}.mp4`;
            contentType = 'video/mp4';
            
            // Filter video dan audio untuk MP4. ytdl-core akan menggabungkan stream.
            ytdlOptions.filter = 'videoandaudio'; 
            ytdlOptions.quality = resolution === 'highestvideo' ? 'highestvideo' : resolution;

        } else { // format === 'mp3'
            filename = `${title}.mp3`;
            contentType = 'audio/mpeg';
            // Filter hanya audio dengan kualitas tertinggi
            ytdlOptions.filter = 'audioonly';
            ytdlOptions.quality = 'highestaudio';
        }

        // 5. Atur Header Respon agar browser mendownload file
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        res.header('Content-Type', contentType);
        res.header('Transfer-Encoding', 'chunked');

        // 6. Mulai Streaming
        const downloadStream = ytdl(youtubeUrl, ytdlOptions);

        downloadStream.on('error', (err) => {
            console.error('[YTDL Stream Error]:', err.message);
            // Jika error terjadi sebelum header terkirim
            if (!res.headersSent) {
                res.status(500).send(`
                    <h2 style="color:red;">STREAMING GAGAL</h2>
                    <p>Gagal memproses video: ${err.message}.</p>
                    <a href="/">Coba Lagi</a>
                `);
            } else {
                // Jika error terjadi di tengah streaming, matikan koneksi
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

// =================================================================
// START SERVER (Non-Serverless)
// =================================================================
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log('Pastikan Anda menjalankan: npm install');
    console.log('Lalu jalankan: node server.js');
});
