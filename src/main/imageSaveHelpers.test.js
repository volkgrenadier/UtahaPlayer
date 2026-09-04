const fs = require('fs');
const os = require('os');
const path = require('path');
const { getEditedCopyDefaultName, rasterToBuffer, writeFileAtomically } = require('./imageSaveHelpers');

describe('image save helpers', () => {
    let testDirectory;

    beforeEach(() => {
        testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'utaha-image-save-test-'));
    });

    afterEach(() => {
        fs.rmSync(testDirectory, { recursive: true, force: true });
    });

    test('builds copy names without losing JPEG extensions and flattens GIF names to PNG', () => {
        expect(getEditedCopyDefaultName('C:\\Photos\\portrait.jpeg', 'jpeg')).toBe('portrait-edited.jpeg');
        expect(getEditedCopyDefaultName('C:\\Photos\\portrait.jpg', 'jpeg')).toBe('portrait-edited.jpg');
        expect(getEditedCopyDefaultName('C:\\Photos\\motion.gif', 'png')).toBe('motion-edited.png');
    });

    test('normalizes IPC binary representations without sharing mutable buffers', () => {
        const source = Buffer.from([1, 2, 3]);
        const result = rasterToBuffer(source);
        source[0] = 9;
        expect([...result]).toEqual([1, 2, 3]);

        const typed = new Uint8Array([4, 5, 6]);
        expect([...rasterToBuffer(typed)]).toEqual([4, 5, 6]);
        expect(rasterToBuffer(null)).toBeNull();
    });

    test('writes a validated new file and removes transaction artifacts', async () => {
        const targetPath = path.join(testDirectory, 'edited.png');
        await writeFileAtomically(targetPath, Buffer.from('edited'), {
            transactionId: 'write-new',
            validateFile: async (tempPath) => fs.readFileSync(tempPath, 'utf8') === 'edited',
        });

        expect(fs.readFileSync(targetPath, 'utf8')).toBe('edited');
        expect(fs.readdirSync(testDirectory)).toEqual(['edited.png']);
    });

    test('keeps the original untouched when validation fails', async () => {
        const targetPath = path.join(testDirectory, 'original.png');
        fs.writeFileSync(targetPath, 'original');

        await expect(writeFileAtomically(targetPath, Buffer.from('invalid'), {
            transactionId: 'invalid',
            validateFile: async () => false,
        })).rejects.toMatchObject({ code: 'VERIFY_FAILED' });

        expect(fs.readFileSync(targetPath, 'utf8')).toBe('original');
        expect(fs.readdirSync(testDirectory)).toEqual(['original.png']);
    });

    test('restores the backup when replacing the target fails', async () => {
        const targetPath = path.join(testDirectory, 'original.jpg');
        fs.writeFileSync(targetPath, 'original');
        const failingFileSystem = {
            existsSync: fs.existsSync,
            promises: {
                writeFile: fs.promises.writeFile.bind(fs.promises),
                unlink: fs.promises.unlink.bind(fs.promises),
                rename: async (source, target) => {
                    if (source.includes('.tmp')) {
                        const error = new Error('simulated replacement failure');
                        error.code = 'EACCES';
                        throw error;
                    }
                    return fs.promises.rename(source, target);
                },
            },
        };

        await expect(writeFileAtomically(targetPath, Buffer.from('edited'), {
            transactionId: 'rollback',
            fileSystem: failingFileSystem,
            validateFile: async () => true,
        })).rejects.toMatchObject({ code: 'EACCES' });

        expect(fs.readFileSync(targetPath, 'utf8')).toBe('original');
        expect(fs.readdirSync(testDirectory)).toEqual(['original.jpg']);
    });

    test('restores the original when library persistence fails after replacement', async () => {
        const targetPath = path.join(testDirectory, 'original.png');
        fs.writeFileSync(targetPath, 'original');

        await expect(writeFileAtomically(targetPath, Buffer.from('edited'), {
            transactionId: 'post-write-rollback',
            validateFile: async () => true,
            afterReplace: async () => {
                throw new Error('simulated library persistence failure');
            },
        })).rejects.toThrow('simulated library persistence failure');

        expect(fs.readFileSync(targetPath, 'utf8')).toBe('original');
        expect(fs.readdirSync(testDirectory)).toEqual(['original.png']);
    });

    test('removes a newly created copy when post-write work fails', async () => {
        const targetPath = path.join(testDirectory, 'copy.png');

        await expect(writeFileAtomically(targetPath, Buffer.from('edited'), {
            transactionId: 'copy-post-write-rollback',
            validateFile: async () => true,
            afterReplace: async () => {
                throw new Error('simulated thumbnail failure');
            },
        })).rejects.toThrow('simulated thumbnail failure');

        expect(fs.existsSync(targetPath)).toBe(false);
        expect(fs.readdirSync(testDirectory)).toEqual([]);
    });
});
