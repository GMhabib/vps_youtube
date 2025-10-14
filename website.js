const express = require('express');
const { youtube } = require('notmebotz-tools');
const app = express();

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Downloader</title>
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
                    <div class="input-group input-group-lg" id="resolutionDiv" style="display:none;">
                        <select name="resolution" class="form-select">
                            <option value="1080">1080p</option>
                            <option value="720">720p</option>
                            <option value="480">480p</option>
                            <option value="360">360p</option>
                            <option value="240">240p</option>
                            <option value="144">144p</option>
                        </select>
                    </div>
                    <div class="d-grid">
                        <button class="btn btn-danger fw-bold btn-lg mt-3" type="submit">Download</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
    <script>
        document.getElementById('formatSelect').addEventListener('change', function() {
            document.getElementById('resolutionDiv').style.display = this.value === 'mp4' ? 'flex' : 'none';
        });
        document.getElementById('formatSelect').dispatchEvent(new Event('change'));
    </script>
</body>
</html>
    `);
});

app.post('/download', async (req, res) => {
    const { youtubeUrl, format, resolution } = req.body;

    try {
        let type = format === 'mp4' ? `mp4${resolution || '1080'}` : 'mp3';
        const yt = await youtube(type, youtubeUrl);

        if (!yt || !yt.data || !yt.data.download || !yt.data.download.url) {
            return res.status(400).send(`
                <h2 style="color:red;">GAGAL MENGAMBIL URL DOWNLOAD</h2>
                <p>Data download tidak tersedia dari API.</p>
                <a href="/">Coba Lagi</a>
            `);
        }

        const downloadUrl = yt.data.download.url;

        res.redirect(downloadUrl);

    } catch (error) {
        console.error(`[Error]: ${error.message}`);
        res.status(500).send(`
            <h2 style="color:red;">INTERNAL SERVER ERROR</h2>
            <p>Gagal memproses permintaan download: ${error.message}</p>
            <a href="/">Coba Lagi</a>
        `);
    }
});

module.exports = app;
