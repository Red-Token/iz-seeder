import express from 'express';
import WebTorrent from "webtorrent";
import SimplePeer from "simple-peer";

const app = express();
const PORT = 3000;

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

// Basic routes
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.get('/api/example', (req, res) => {

    const assets = [
        {
            // 82f0a7541549b94782eec5049e2fae7c9fad3210e9
            name: 'Big Buck Bunny',
            imdbId: 'tt1254207',
            file: '/var/tmp/bbb/big.buck.bunny/out/big.buck.bunny.480p.h264.aac.mp4',
            register: true
        },
        {
            name: 'Big Buck Bunny',
            imdbId: 'tt1254207',
            file: '/var/tmp/bbb/big.buck.bunny/out/big.buck.bunny.720p.h264.aac.mp4',
            register: true
        },
        {
            name: 'Big Buck Bunny',
            imdbId: 'tt1254207',
            file: '/var/tmp/bbb/big.buck.bunny/out/big.buck.bunny.1080p.h264.aac.mp4',
            register: true
        },
        {
            name: 'Big Buck Bunny',
            imdbId: 'tt1254207',
            file: '/var/tmp/bbb/big.buck.bunny/out/big.buck.bunny.2160p.h264.aac.mp4',
            register: true
        },
    ]

    for (const asset of assets) {
        const torrent = wt.seed(asset.file, options)

        torrent.on('infoHash', () => {
            console.log(torrent.infoHash)
            const testAssetAnnotation = {"imdbId": asset.imdbId.substring(2, 10), "infoHash": torrent.infoHash}

            if (asset.register) {
                // nostr it!
            }
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


console.log(`WARHALLA`);
