const fs = require('fs');

function resolveBinaryPath(exportedPath) {
    if (typeof exportedPath !== 'string' || !exportedPath) return null;

    // Electron can report an archived executable as existing, but child processes
    // need the physical unpacked file, including ffprobe's platform/arch folders.
    const unpackedPath = exportedPath.replace(/\.asar([\\/])/g, '.asar.unpacked$1');
    if (unpackedPath !== exportedPath && fs.existsSync(unpackedPath)) return unpackedPath;

    return exportedPath;
}

module.exports = { resolveBinaryPath };
