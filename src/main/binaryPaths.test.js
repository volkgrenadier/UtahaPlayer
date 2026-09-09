const fs = require('fs');
const { resolveBinaryPath } = require('./binaryPaths');

jest.mock('fs', () => ({ existsSync: jest.fn() }));

describe('packaged media executables', () => {
    beforeEach(() => fs.existsSync.mockReset());

    test('prefers the unpacked Windows executable even when the archive path exists', () => {
        fs.existsSync.mockReturnValue(true);
        expect(resolveBinaryPath('C:\\Utaha\\resources\\app.asar\\node_modules\\ffmpeg-static\\ffmpeg.exe'))
            .toBe('C:\\Utaha\\resources\\app.asar.unpacked\\node_modules\\ffmpeg-static\\ffmpeg.exe');
    });

    test('preserves ffprobe platform and architecture subdirectories', () => {
        fs.existsSync.mockReturnValue(true);
        expect(resolveBinaryPath('/Utaha/resources/app.asar/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe'))
            .toBe('/Utaha/resources/app.asar.unpacked/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
    });

    test('keeps development and already unpacked paths intact', () => {
        const paths = [
            'D:\\Code\\node_modules\\ffmpeg-static\\ffmpeg.exe',
            '/Utaha/resources/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg',
        ];
        paths.forEach(binaryPath => expect(resolveBinaryPath(binaryPath)).toBe(binaryPath));
        expect(fs.existsSync).not.toHaveBeenCalled();
    });

    test('retains the original path if no unpacked copy exists', () => {
        fs.existsSync.mockReturnValue(false);
        const original = '/Utaha/resources/app.asar/node_modules/ffmpeg-static/ffmpeg';
        expect(resolveBinaryPath(original)).toBe(original);
        expect(resolveBinaryPath(null)).toBeNull();
    });
});
