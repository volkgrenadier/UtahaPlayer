const fs = require('fs');
const os = require('os');
const path = require('path');
const { collectMediaFiles, normalizeExtensions } = require('./mediaImportHelpers');

describe('mediaImportHelpers', () => {
    let temporaryDirectory;

    beforeEach(async () => {
        temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'utaha-import-'));
    });

    afterEach(async () => {
        await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
    });

    test('normalizes extensions with or without a leading dot', () => {
        expect([...normalizeExtensions(['MP3', '.Flac', ''])]).toEqual(['.mp3', '.flac']);
    });

    test('recursively returns only matching regular files', async () => {
        const albumDirectory = path.join(temporaryDirectory, 'album');
        await fs.promises.mkdir(albumDirectory);
        await Promise.all([
            fs.promises.writeFile(path.join(temporaryDirectory, 'track.MP3'), 'audio'),
            fs.promises.writeFile(path.join(temporaryDirectory, 'notes.txt'), 'notes'),
            fs.promises.writeFile(path.join(albumDirectory, 'second.flac'), 'audio'),
        ]);

        const files = await collectMediaFiles(temporaryDirectory, ['mp3', '.flac']);

        expect(files.map((filePath) => path.basename(filePath)).sort()).toEqual(['second.flac', 'track.MP3']);
    });

    test('rejects a folder that exceeds the bounded import size', async () => {
        await Promise.all([
            fs.promises.writeFile(path.join(temporaryDirectory, 'one.png'), 'image'),
            fs.promises.writeFile(path.join(temporaryDirectory, 'two.png'), 'image'),
        ]);

        await expect(collectMediaFiles(temporaryDirectory, ['png'], { maxFiles: 1 }))
            .rejects.toMatchObject({ code: 'IMPORT_FILE_LIMIT_EXCEEDED' });
    });
});
