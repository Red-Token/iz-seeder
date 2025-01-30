import ffmpeg from 'fluent-ffmpeg';

const formats = {
    sd: {
        width: 720,
        height: 480,
    },
    hd: {
        width: 1280,
        height: 720,
    },
    fhd: {
        width: 1920,
        height: 1080,
    },
    uhd: {
        width: 3840,
        height: 3840,
    }
}

describe('Async Test Example', () => {

    before(function () {
        // Code to run before all tests
    });

    it('should complete an async operation', async () => {
        console.log("ZZZZZ")

        const inputFile = '/var/tmp/bbb/big.buck.bunny/orig/bbb_sunflower_2160p_60fps_normal.mp4';

        ffmpeg.ffprobe(inputFile, async (err, metadata) => {
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

            let cmd = ffmpeg(inputFile).complexFilter(complexFilterCommand);
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
                .addOption("-window_size", '5')
                .addOption("-init_seg_name", "init_$RepresentationID$.mp4")
                .addOption("-media_seg_name", "segment_$RepresentationID$_$Number$.m4s")
                .output("/tmp/out/asset.mpd")

            cmd.on('start', (commandLine) => {
                console.log('FFmpeg command: ', commandLine);
            }).on('progress', (progress) => {
                console.log('FFmpeg progress: ', progress);
            }).on('end', () => {
                console.log('Processing finished successfully!');
            }).on('error', (err) => {
                console.error('Error: ', err.message);
            }).run()

            // const okFormats = Object.entries(formats).filter(([name, val]) => (val.height <= videoStream.height!))
            //
            // ffmpeg(inputFile)
            //     .complexFilter("[0:v]split=4[v1][v2][v3][v4];[v1]scale=3840:2160[uhd];[v2]scale=1920:1080[fhd];[v3]scale=1280:720[hd];[v4]scale=854:480[sd]")
            //     .map('[uhd]').addOption("-g", "48").addOption("-keyint_min", "48")
            //     .map('[fhd]').addOption("-g", "48").addOption("-keyint_min", "48")
            //     .map('[hd]').addOption("-g", "48").addOption("-keyint_min", "48")
            //     .map('[sd]').addOption("-g", "48").addOption("-keyint_min", "48")
            //     // .map('[uhd]').addOption("-b:v", "8000k").addOption("-g", "48").addOption("-keyint_min", "48")
            //     // .map('[fhd]').addOption("-b:v", "5000k").addOption("-g", "48").addOption("-keyint_min", "48")
            //     // .map('[hd]').addOption("-b:v", "3000k").addOption("-g", "48").addOption("-keyint_min", "48")
            //     // .map('[sd]').addOption("-b:v", "1500k").addOption("-g", "48").addOption("-keyint_min", "48")
            //     // .addOption("-map", '0:a')
            //     .format("dash")
            //     .addOption("-init_seg_name", "init_$RepresentationID$.mp4")
            //     .addOption("-media_seg_name", "segment_$RepresentationID$_$Number$.m4s")
            //     .addOption("-seg_duration", "10")
            //     .output("/tmp/out/trump.mpd")
            //     .on('start', (commandLine) => {
            //         console.log('FFmpeg command: ', commandLine);
            //     })
            //     .on('progress', (progress) => {
            //         console.log('FFmpeg progress: ', progress);
            //     })
            //     .on('end', () => {
            //         console.log('Processing finished successfully!');
            //     })
            //     .on('error', (err) => {
            //         console.error('Error: ', err.message);
            //     })
            //     .run();

            // Example: Accessing specific metadata
            console.log('Duration:', metadata.format.duration); // In seconds
            console.log('Video codec:', metadata.streams.find((s) => s.codec_type === 'video')?.codec_name);
            console.log('Audio codec:', metadata.streams.find((s) => s.codec_type === 'audio')?.codec_name);
        });
    })
})
