import express, {NextFunction} from 'express';
import WebTorrent from "webtorrent";
import SimplePeer from "simple-peer";
import path from "path";
import cors from 'cors';

import {WebSocketServer, WebSocket} from 'ws';

const app = express();
const PORT = 3000;

import multer from "multer";
import {mkdirSync} from "fs";
import {randomUUID} from "node:crypto";
import ffmpeg from "fluent-ffmpeg";

const rtcConfig = {
    iceServers: [
        {
            urls: [
                "turn:turn.stream.labs.h3.se",
            ],
            username: "test",
            credential: "testme",
        },
        {
            urls:
                ["stun:stun.stream.labs.h3.se"],
            username: "test",
            credential: "testme",
        }],
    iceTransportPolicy: "all",
    iceCandidatePoolSize: 0,
}

const wt = new WebTorrent({
    tracker: {
        rtcConfig: {
            ...SimplePeer.config,
            ...rtcConfig
        }
    }
});

const options = {
    announce: ['wss://tracker.webtorrent.dev'],
    maxWebConns: 500,
}

// Middleware for parsing JSON
app.use(express.json());
app.use(cors());

// Basic routes
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.get('/api/example', (req, res) => {

    const assets = [
        // {
        //     // 82f0a7541549b94782eec5049e2fae7c9fad3210e9
        //     name: 'Big Buck Bunny',
        //     imdbId: 'tt1254207',
        //     file: '/var/tmp/bbb/big.buck.bunny/out/big.buck.bunny.480p.h264.aac.mp4',
        //     register: true
        // },
        // {
        //     name: 'Big Buck Bunny',
        //     imdbId: 'tt1254207',
        //     file: '/var/tmp/bbb/big.buck.bunny/out/big.buck.bunny.720p.h264.aac.mp4',
        //     register: true
        // },
        // {
        //     name: 'Big Buck Bunny',
        //     imdbId: 'tt1254207',
        //     file: '/var/tmp/bbb/big.buck.bunny/out/big.buck.bunny.1080p.h264.aac.mp4',
        //     register: true
        // },
        // {
        //     name: 'Big Buck Bunny',
        //     imdbId: 'tt1254207',
        //     file: '/var/tmp/bbb/big.buck.bunny/out/big.buck.bunny.2160p.h264.aac.mp4',
        //     register: true
        // },
        {
            name: 'Big Buck Bunny DaSH',
            imdbId: 'tt1254207',
            file: '/tmp/out/xyz',
            register: true
        },
    ]

    for (const asset of assets) {
        const torrent = wt.seed(asset.file, options)

        torrent.on('infoHash', () => {
            const testAssetAnnotation = {"imdbId": asset.imdbId.substring(2, 10), "infoHash": torrent.infoHash}

            if (asset.register) {
                // nostr it!
            }

            torrent.files.forEach(file => {
                console.log(file)
            })

            console.log(torrent.infoHash)
        })

        torrent.on('warning', err => {
            console.log(err)
        });
        torrent.on('error', err => {
            console.log(err)
        });
        torrent.on('wire', wire => {
            console.log(wire)
        });
        torrent.on('download', bytes => {
            console.log(bytes)
        });
        torrent.on('upload', bytes => {
            console.log(bytes)
        });
    }

    res.json({message: 'This is an example route!'});
});

const srcDir = path.join('/var/tmp/seeder', "uploads")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Set the destination directory for uploads
        cb(null, path.join('/var/tmp/seeder', "uploads"));
    },
    filename: (req, file, cb) => {
        // Use the original file name or generate a unique name
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

// Initialize Multer with storage and file size limit
const upload = multer({
    storage,
    limits: {fileSize: 4000 * 1024 * 1024}, // Limit to 200 MB
});

app.get('/api/zorro', (req, res) => {
    const infoHash = '634f15dd28521fb29a458e3500f9137fcfe6365d'
    const torrent = wt.add(infoHash, options)

    torrent.on('download', bytes => {
        console.log('down:' + bytes)
    })

    torrent.on('upload', bytes => {
        console.log('up' + bytes)
    })

    torrent.on('done', () => {
        console.log('DONE!')
    })

    torrent.on('wire', function (wire) {
        console.log(wire)
    })
})

app.post(
    '/api/upload',
    upload.single('file'),
    (req, res) => {
        const id = randomUUID()
        const targetDir = `/var/tmp/seeder/torrents/${id}`
        const srcFile = path.join(srcDir, req.file.filename)

        console.log(`Uploading ${id} to ${srcFile}`)

        res.status(200).json({
            message: "File uploaded successfully",
            id,
            fileName: req.file.filename,
        });

        mkdirSync(targetDir)
        transcode(id, targetDir, srcFile).then(() => {
        })
    }
)

async function transcode(id: string, targetDir: string, srcFile: string) {
    ffmpeg.ffprobe(srcFile, (err, metadata) => {
        if (err) {
            console.error('Error retrieving metadata:', err);
            return;
        }

        console.log('Metadata:', metadata);

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video')

        if (videoStream === undefined)
            throw new Error('No video stream');

        const formats = {
            sd: {
                width: 720,
                height: 480,
                // bitrate: '1500k'
            },
            hd: {
                width: 1280,
                height: 720,
                // bitrate: '2500k'
            },
            fhd: {
                width: 1920,
                height: 1080,
                // bitrate: '5000k'
            },
            uhd: {
                width: 3840,
                height: 2160,
                // bitrate: '8000k'
            }
        }

        let complexFilterCommand = ''
        Object.entries(formats).forEach(([key, value]) => {
            complexFilterCommand += `[0:v]scale=${value.width}x${value.height}[${key}];`
        })

        let cmd = ffmpeg(srcFile).complexFilter(complexFilterCommand);
        let i = 1
        const videoCodec = 'libx264'

        Object.entries(formats).forEach(([key, value]) => {
            // cmd = cmd.map(`[${key}]`).addOption(`-c:v:${i} ${videoCodec}`).addOption(`-b:v:${i} ${value.bitrate}`)
            cmd = cmd.map(`[${key}]`).addOption(`-c:v:${i} ${videoCodec}`).addOption("-g", "48").addOption("-keyint_min", "48")
            i++
        })

        const audioCodec = 'aac'
        const audioBitrate = '128k'
        cmd = cmd.addOption('-map', '0:a').addOption(`-c:a ${audioCodec}`).addOption(`-b:a ${audioBitrate}`)

        cmd = cmd.format('dash')
            .addOption("-seg_duration", '10')
            // .addOption("-window_size", '5')
            .addOption("-init_seg_name", "init_$RepresentationID$.mp4")
            .addOption("-media_seg_name", "segment_$RepresentationID$_$Number$.m4s")
            .output(path.join(targetDir, 'asset.mpd'))

        cmd.on('start', (commandLine) => {
            console.log('FFmpeg command: ', commandLine);

            wss.clients.forEach(client => {
                client.send(JSON.stringify({id, msg: `starting ${commandLine}`}));
            })

        }).on('progress', (progress) => {
            console.log('FFmpeg progress: ', progress);

            wss.clients.forEach(client => {
                client.send(JSON.stringify({id, progress, msg: `progress ${progress}`}));
            })
        }).on('end', () => {
            console.log('Processing finished successfully!');
            wss.clients.forEach(client => {
                client.send(JSON.stringify({id, msg: 'Processing finished successfully!'}));
            })

            seed(id, targetDir);
        }).on('error', (err) => {
            console.error('Error: ', err.message);
            wss.clients.forEach(client => {
                client.send(JSON.stringify({error: err.message}));
            })
        }).run()
    })
}

function seed(id: string, asset: string) {
    const torrent = wt.seed(asset, options)

    torrent.on('infoHash', () => {
        wss.clients.forEach(client => {
            client.send(JSON.stringify({id, infoHash: torrent.infoHash, msg: "Seeding"}));
        })
    })

    torrent.on('warning', err => {
        console.log(err)
    });
    torrent.on('error', err => {
        console.log(err)
    });
    torrent.on('wire', wire => {
        console.log(wire)
    });
    torrent.on('download', bytes => {
        console.log(bytes)
    });
    torrent.on('upload', bytes => {
        console.log(bytes)
    });
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({port: 3400});

const map = new Map<string, WebSocket[]>

wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected');

    // Event: Receive a message from the client
    ws.on('message', (message: string) => {
        const req = JSON.parse(message);

        if (req.id === upload) console.log("No ID");

        if (map.has(req.id))
            map.set(req.id, []);

        map.get(req.id)?.push(ws);
    });

    // Event: Client disconnects
    ws.on('close', () => {
        console.log('Client disconnected');
    });

    // Event: Error occurs
    ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
    });
});

console.log(`WARHALLA`);
