const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8080;

let publicUrl = '';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function startServeoTunnel() {
    return new Promise((resolve, reject) => {
        console.log(' Mencoba membuat tunnel dengan Serveo.net...');
        const serveo = spawn('ssh', [
            '-R', `80:localhost:${port}`,
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'ServerAliveInterval=60',
            'serveo.net'
        ]);

        let resolved = false;

        serveo.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[Serveo STDOUT]: ${output}`);
            const urlMatch = output.match(/https?:\/\/[a-zA-Z0-9-]+\.serveo\.net/);

            if (urlMatch && !resolved) {
                resolved = true;
                const url = urlMatch[0];
                console.log(` URL Publik berhasil didapatkan: ${url}`);
                resolve(url);
            }
        });

        serveo.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            console.error(`[Serveo STDERR]: ${errorOutput}`);
            if (errorOutput.includes('Connection refused') && !resolved) {
                reject(new Error('Koneksi ke Serveo.net ditolak. Pastikan SSH client terinstall dan bisa mengakses serveo.net.'));
            }
        });

        serveo.on('close', (code) => {
            console.log(`Proses Serveo ditutup dengan kode: ${code}`);
        });
    });
}

app.use(express.urlencoded({ extended: true }));
app.use('/downloads', express.static(DOWNLOAD_DIR));

app.get('/', (req, res) => {
    // Tampilan HTML tidak berubah
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
        /* Latar belakang gradien agar efek kaca terlihat maksimal */
        body {
            background: linear-gradient(135deg, #1d2b64 0%, #f8cdda 100%);
            min-height: 100vh;
        }

        /* Class custom untuk efek glassmorphism */
        .glass-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px); /* For Safari */
            border-radius: 1.25rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.3);
        }

        /* Mengubah warna placeholder pada input */
        .form-control::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        
        /* Memberi efek transparan pada input group */
        .input-group .form-control, .input-group .form-select {
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
        }

        /* Menyesuaikan warna option pada select */
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
                    Tempelkan link video atau playlist YouTube untuk memulai.
                </p>

                <form action="/download" method="POST">
                    <div class="input-group input-group-lg mb-4">
                        <span class="input-group-text bg-transparent border-end-0">
                            <i class="bi bi-link-45deg text-white"></i>
                        </span>
                        <input type="url" name="youtubeUrl" class="form-control border-start-0" placeholder="https://www.youtube.com/watch?v=..." required>
                    </div>

                    <div class="input-group input-group-lg">
                        <select name="format" class="form-select">
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

app.post('/download', (req, res) => {
    const { youtubeUrl, format } = req.body;

    if (!youtubeUrl || (!youtubeUrl.includes('youtube.com/') && !youtubeUrl.includes('youtu.be/'))) {
        return res.status(400).send('URL YouTube tidak valid.');
    }

    const outputTemplate = path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s');
    let ytDlpCommand;

    if (format === 'mp4') {
        ytDlpCommand = `yt-dlp -f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]' --merge-output-format mp4 -o "${outputTemplate}" "${youtubeUrl}" --print after_move:filepath`;
    } else {
        ytDlpCommand = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputTemplate}" "${youtubeUrl}" --print after_move:filepath`;
    }

    console.log(`Menjalankan command: ${ytDlpCommand}`);

    exec(ytDlpCommand, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error yt-dlp: ${error.message}`);
            return res.status(500).send(`<p class="error">Gagal mendownload.</p><pre>${stderr.substring(0, 500)}</pre><a href="/">Coba Lagi</a>`);
        }

        const downloadedFiles = stdout.trim().split('\n').filter(filePath => filePath.length > 0);

        if (downloadedFiles.length === 0) {
            return res.status(404).send(`<p class="error">Gagal mendownload: Tidak ada file yang dihasilkan.</p><a href="/">Coba Lagi</a>`);
        }

        let linksHtml = downloadedFiles.map(filePath => {
            const fileName = path.basename(filePath);
            const fileUrl = `${publicUrl}/downloads/${encodeURIComponent(fileName)}`;
            
            setTimeout(() => {
                fs.unlink(filePath, err => {
                    if (err) console.error(`Gagal menghapus file ${filePath}:`, err);
                    else console.log(`File sementara ${filePath} dihapus.`);
                });
            }, 600000);

            return `<li><a href="${fileUrl}" download>${fileName}</a></li>`;
        }).join('');

        res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Download Selesai</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

    <style>
        /* Latar belakang untuk menonjolkan efek glassmorphism */
        body {
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Class custom untuk efek glassmorphism */
        .glass-effect {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px); /* Untuk support Safari */
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
        }

        /* Mengubah warna teks default card agar terbaca di background gelap */
        .card-body {
            color: #f8f9fa; /* Warna teks light */
        }
        
        /* Style untuk link download agar lebih menarik */
        .download-link {
            transition: all 0.2s ease-in-out;
        }
        .download-link:hover {
            transform: scale(1.02);
        }
                a {
          background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px); /* Untuk support Safari */
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
          text-decoration: none;
          color: whitesmoke;
        }
    </style>
</head>
<body>

    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-11 col-md-8 col-lg-6">
                <div class="card glass-effect text-center border-0">
                    <div class="card-body p-4 p-md-5">
                        
                        <i class="bi bi-check-circle-fill display-3 text-light mb-3"></i>
                        
                        <h2 class="card-title fw-bold mb-3">Download Berhasil!</h2>
                        <p class="text-light-50 mb-4">
                            Klik tombol di bawah ini untuk mengunduh file Anda.
                        </p>

                        <div class="d-grid gap-2 mb-4">
                            ${linksHtml}
                            
                            </div>

                        <p class="text-light-50 small">
                            Link akan kedaluwarsa dan file akan dihapus dalam 10 menit.
                        </p>
                        
                        <a href="/" class="btn btn-light mt-4 fw-bold">Download Video Lain</a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
</body>
</html>
        `);
    });
});

async function main() {
    try {
        publicUrl = await startServeoTunnel();

        app.listen(port, () => {
            console.log(`=================================================`);
            console.log(`Server lokal berjalan di http://localhost:${port}`);
            console.log(`Aplikasi Anda sekarang bisa diakses publik melalui:`);
            console.log(`>> ${publicUrl} <<`);
            console.log(`=================================================`);

            // ---== BLOK KODE YANG DITAMBAHKAN ==---
            // Cek apakah skrip berjalan di dalam Termux
            if (process.env.TERMUX_VERSION) {
                console.log(' Lingkungan Termux terdeteksi. Membuka URL di browser...');
                const openCommand = `termux-open-url "${publicUrl}"`;
                exec(openCommand, (error) => {
                    if (error) {
                        console.error(`Gagal menjalankan termux-open-url: ${error.message}`);
                        return;
                    }
                    console.log(' Perintah untuk membuka URL berhasil dikirim.');
                });
            }
            // ---== AKHIR DARI BLOK KODE ==---

            console.log(`(Jangan tutup terminal ini agar tunnel tetap aktif)`);
        });

    } catch (error) {
        console.error(' Gagal memulai aplikasi:', error.message);
        process.exit(1);
    }
}

main();
