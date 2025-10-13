// website.js (Versi Serverless/Vercel)

const express = require('express');
const ytdl = require('ytdl-core'); // Pustaka Node.js murni untuk streaming
const app = express();

// Hapus semua: require('child_process'), require('fs'), require('path')
// Hapus semua: DOWNLOAD_DIR, fs.mkdirSync, startServeoTunnel, main()

app.use(express.urlencoded({ extended: true }));

// Endpoint Utama (Tampilan Form)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Downloader Vercel</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    
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
    </style>
</head>
<body class="d-flex align-items-center justify-content-center px-3">

    <div class="col-11 col-md-8 col-lg-6 col-xl-5">
        <div class="card glass-card text-white border-0">
            <div class="card-body p-4 p-lg-5 text-center">
                <i class="bi bi-youtube display-4 mb-3 text-danger"></i>
                <h1 class="fw-bold mb-3">YouTube Downloader</h1>
                <p class="mb-4">
                    Tempelkan link video YouTube untuk memulai.
                </p>

                <form action="/download" method="POST">
                    <div class="input-group input-group-lg mb-4">
                        <span class="input-group-text bg-transparent border-end-0">
                            <i class="bi bi-link-45deg text-white"></i>
                        </span>
                        <input type="url" name="youtubeUrl" class="form-control border-start-0" placeholder="https://www.youtube.com/watch?v=..." required>
                    </div>

                    <div class="input-group input-group-lg">
                        <select name="format" class="form-select" required>
                            <option value="mp4" selected>MP4 (Video)</option>
                            <option value="mp3">MP3 (Audio)</option>
                        </select>
                        <button class="btn btn-danger fw-bold" type="submit">Download</button>
                    </div>
                </form>

            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
</body>
</html>
    `);
});

// Endpoint Download (Menggunakan Streaming Langsung)
app.post('/download', async (req, res) => {
    const { youtubeUrl, format } = req.body;

    if (!ytdl.validateURL(youtubeUrl)) {
        return res.status(400).send('URL YouTube tidak valid.');
    }

    try {
        // 1. Ambil informasi video untuk mendapatkan judul
        const info = await ytdl.getInfo(youtubeUrl);
        // Sanitasi Judul (Hapus karakter non-alfanumerik)
        const title = info.videoDetails.title.replace(/[^\w\s-]/g, '').trim();

        let filename;
        let contentType;
        let ytdlOptions = {};

        // 2. Tentukan format dan opsi ytdl-core
        if (format === 'mp4') {
            filename = `${title}.mp4`;
            contentType = 'video/mp4';
            // Untuk MP4 (video), gunakan kualitas tertinggi yang menggabungkan audio dan video
            ytdlOptions = { quality: 'highestvideo' }; 
        } else { // format === 'mp3'
            filename = `${title}.mp3`;
            contentType = 'audio/mpeg';
            // Untuk MP3 (audio), filter hanya audio
            ytdlOptions = { filter: 'audioonly', quality: 'highestaudio' };
        }

        // 3. Atur Header Respon untuk Download
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        res.header('Content-Type', contentType);
        res.header('Transfer-Encoding', 'chunked'); // Penting untuk streaming besar

        // 4. Stream Data Video/Audio Langsung ke Klien
        const downloadStream = ytdl(youtubeUrl, ytdlOptions);

        downloadStream.on('error', (err) => {
            console.error('[YTDL Error]:', err.message);
            // Hanya kirim status error jika belum ada data yang terkirim
            if (!res.headersSent) {
                res.status(500).send(`Gagal memproses video: ${err.message}`);
            } else {
                res.end(); // Akhiri stream
            }
        });

        // Pipe stream download ke response Express
        downloadStream.pipe(res);

    } catch (error) {
        console.error(`[Server Error]: ${error.message}`);
        res.status(500).send(`
            <h2 style="color:red;">INTERNAL SERVER ERROR</h2>
            <p>Gagal memproses permintaan download: ${error.message}</p>
            <a href="/">Coba Lagi</a>
        `);
    }
});


// Export Express app untuk Vercel
module.exports = app;
// Semua kode serveo.net, main(), dan app.listen() DIHAPUS.
