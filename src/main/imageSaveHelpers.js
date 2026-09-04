const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function rasterToBuffer(raster) {
    if (Buffer.isBuffer(raster)) return Buffer.from(raster);
    if (raster instanceof ArrayBuffer) return Buffer.from(raster);
    if (ArrayBuffer.isView(raster)) {
        return Buffer.from(raster.buffer, raster.byteOffset, raster.byteLength);
    }
    return null;
}

function getEditedCopyDefaultName(sourcePath, format) {
    const sourceExtension = path.extname(sourcePath).toLocaleLowerCase();
    const extension = format === 'jpeg'
        ? (sourceExtension === '.jpeg' ? '.jpeg' : '.jpg')
        : '.png';
    return `${path.basename(sourcePath, sourceExtension)}-edited${extension}`;
}

async function unlinkIfExists(filePath, fileSystem = fs) {
    try {
        await fileSystem.promises.unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

async function writeFileAtomically(targetPath, data, options = {}) {
    const fileSystem = options.fileSystem || fs;
    const validateFile = options.validateFile || (async () => true);
    const targetDirectory = path.dirname(targetPath);
    const targetExtension = path.extname(targetPath);
    const transactionId = options.transactionId || crypto.randomUUID();
    const tempPath = path.join(
        targetDirectory,
        `.${path.basename(targetPath, targetExtension)}.utaha-${transactionId}.tmp${targetExtension}`,
    );
    const backupPath = path.join(
        targetDirectory,
        `.${path.basename(targetPath)}.utaha-${transactionId}.backup`,
    );
    let backupCreated = false;

    try {
        await fileSystem.promises.writeFile(tempPath, data, { flag: 'wx' });
        if (!await validateFile(tempPath)) {
            const error = new Error('临时文件验证失败');
            error.code = 'VERIFY_FAILED';
            throw error;
        }

        if (fileSystem.existsSync(targetPath)) {
            await fileSystem.promises.rename(targetPath, backupPath);
            backupCreated = true;
        }

        try {
            await fileSystem.promises.rename(tempPath, targetPath);
        } catch (writeError) {
            if (backupCreated) {
                try {
                    await fileSystem.promises.rename(backupPath, targetPath);
                    backupCreated = false;
                } catch (rollbackError) {
                    writeError.code = 'ROLLBACK_FAILED';
                    writeError.message = `写入失败且无法恢复原文件：${rollbackError.message}`;
                }
            }
            throw writeError;
        }

        if (typeof options.afterReplace === 'function') {
            try {
                await options.afterReplace(targetPath);
            } catch (postWriteError) {
                try {
                    await unlinkIfExists(targetPath, fileSystem);
                    if (backupCreated) {
                        await fileSystem.promises.rename(backupPath, targetPath);
                        backupCreated = false;
                    }
                } catch (rollbackError) {
                    postWriteError.code = 'ROLLBACK_FAILED';
                    postWriteError.message = `保存后处理失败且无法恢复原文件：${rollbackError.message}`;
                }
                throw postWriteError;
            }
        }

        if (backupCreated) {
            try {
                await unlinkIfExists(backupPath, fileSystem);
                backupCreated = false;
            } catch (cleanupError) {
                options.onCleanupError?.(backupPath, cleanupError);
            }
        }
    } finally {
        await unlinkIfExists(tempPath, fileSystem).catch(() => {});
    }
}

module.exports = {
    getEditedCopyDefaultName,
    rasterToBuffer,
    unlinkIfExists,
    writeFileAtomically,
};
