const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_FILES = 20_000;

function normalizeExtensions(extensions) {
    return new Set((Array.isArray(extensions) ? extensions : []).map((extension) => {
        const value = String(extension || '').trim().toLowerCase();
        return value.startsWith('.') ? value : `.${value}`;
    }).filter((extension) => extension.length > 1));
}

async function collectMediaFiles(rootPath, extensions, options = {}) {
    if (!rootPath || !path.isAbsolute(rootPath)) {
        throw new TypeError('媒体文件夹路径无效');
    }

    const allowedExtensions = normalizeExtensions(extensions);
    const maxFiles = Number.isInteger(options.maxFiles) && options.maxFiles > 0
        ? options.maxFiles
        : DEFAULT_MAX_FILES;
    const pendingDirectories = [rootPath];
    const files = [];

    while (pendingDirectories.length) {
        const currentDirectory = pendingDirectories.pop();
        let entries;
        try {
            entries = await fs.promises.readdir(currentDirectory, { withFileTypes: true });
        } catch (error) {
            if (currentDirectory === rootPath) throw error;
            continue;
        }

        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            if (entry.isSymbolicLink()) continue;
            const entryPath = path.join(currentDirectory, entry.name);
            if (entry.isDirectory()) {
                pendingDirectories.push(entryPath);
                continue;
            }
            if (!entry.isFile() || !allowedExtensions.has(path.extname(entry.name).toLowerCase())) continue;
            files.push(entryPath);
            if (files.length > maxFiles) {
                const error = new Error(`单次最多导入 ${maxFiles.toLocaleString()} 个媒体文件`);
                error.code = 'IMPORT_FILE_LIMIT_EXCEEDED';
                throw error;
            }
        }
    }

    return files;
}

module.exports = {
    DEFAULT_MAX_FILES,
    collectMediaFiles,
    normalizeExtensions,
};
