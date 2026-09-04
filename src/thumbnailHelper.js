const { nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

// 缩略图尺寸（宽度），高度等比缩放
const THUMB_WIDTH = 300;

// 缩略图磁盘缓存目录（跨会话复用，避免每次启动重新生成）
let cacheDirectory = path.join(os.tmpdir(), 'utaha-player-thumbnails');

function ensureCacheDirectory() {
    if (!fs.existsSync(cacheDirectory)) {
        fs.mkdirSync(cacheDirectory, { recursive: true });
    }
    return cacheDirectory;
}

function setThumbnailCacheDirectory(directory) {
    if (typeof directory !== 'string' || !path.isAbsolute(directory)) {
        throw new TypeError('Thumbnail cache directory must be an absolute path');
    }
    cacheDirectory = directory;
    ensureCacheDirectory();
}

/**
 * 根据文件路径 + 修改时间生成缓存 key，
 * 文件没变则命中缓存，无需重新生成。
 */
const getCacheKey = (filePath) => {
    const stat = fs.statSync(filePath);
    const raw = `${path.resolve(filePath)}:${stat.mtimeMs}:${stat.size}`;
    return crypto.createHash('md5').update(raw).digest('hex');
};

const getCachePath = (cacheKey) => path.join(ensureCacheDirectory(), `${cacheKey}.jpg`);

const cacheImageAsJpeg = (image, cacheKey, force = false) => {
    const cachePath = getCachePath(cacheKey);
    if (fs.existsSync(cachePath) && !force) return pathToFileURL(cachePath).href;
    if (!image || image.isEmpty()) return null;

    const { width, height } = image.getSize();
    if (!width || !height) return null;
    const thumbWidth = Math.min(THUMB_WIDTH, width);
    const thumbHeight = Math.max(1, Math.round(height * (thumbWidth / width)));
    const resized = image.resize({ width: thumbWidth, height: thumbHeight, quality: 'good' });
    fs.writeFileSync(cachePath, resized.toJPEG(75));
    return pathToFileURL(cachePath).href;
};

/**
 * 为单张图片生成缩略图，返回磁盘缓存的 file URL。
 * 优先读取磁盘缓存；缓存不存在时用 nativeImage 生成并写入缓存。
 * @param {string} filePath  图片的绝对路径
 * @param {{ force?: boolean }} options
 * @returns {string}  file URL，失败时返回 null
 */
const generateThumb = (filePath, options = {}) => {
    try {
        const cacheKey = getCacheKey(filePath);
        const cachePath = getCachePath(cacheKey);
        if (fs.existsSync(cachePath) && !options.force) return pathToFileURL(cachePath).href;
        const image = nativeImage.createFromPath(filePath);
        return cacheImageAsJpeg(image, cacheKey, Boolean(options.force));
    } catch (err) {
        console.error(`[thumbnailHelper] 生成缩略图失败: ${filePath}`, err);
        return null;
    }
};

/**
 * 将旧音乐记录中的内嵌封面迁移到磁盘缓存。不会把 Base64 返回给首页 IPC。
 */
const generateThumbFromDataUrl = (dataUrl, stableKey, options = {}) => {
    try {
        if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
        const cacheKey = crypto.createHash('md5')
            .update(`embedded:${stableKey}\0`)
            .update(dataUrl)
            .digest('hex');
        const image = nativeImage.createFromDataURL(dataUrl);
        return cacheImageAsJpeg(image, cacheKey, Boolean(options.force));
    } catch (err) {
        console.error('[thumbnailHelper] 缓存内嵌封面失败:', err);
        return null;
    }
};

/**
 * 批量为图片列表生成缩略图。
 * 在你现有的 getImages 返回结果后调用此函数，
 * 会在每个图片对象上附加 thumb 字段。
 *
 * @param {Array<{ src: string, [key: string]: any }>} imageList  图片列表
 * @returns {Array<{ src: string, thumb: string|null, [key: string]: any }>}
 *
 * 用法示例（主进程中）：
 *   const { attachThumbs } = require('./thumbnailHelper');
 *   ipcMain.handle('getImages', async () => {
 *       const images = await yourExistingGetImages(); // [{ src: '/path/to/img.jpg', ... }]
 *       return attachThumbs(images);
 *       // 返回 [{ src: '/path/to/img.jpg', thumb: 'file:///.../thumbnail.jpg' }, ...]
 *   });
 */
const attachThumbs = (imageList = []) => {
    return imageList.map((item) => {
        const thumbnailUrl = generateThumb(item.src || item.path);
        return {
            ...item,
            thumbnailUrl,
            thumb: thumbnailUrl,
        };
    });
};

module.exports = {
    attachThumbs,
    generateThumb,
    generateThumbFromDataUrl,
    setThumbnailCacheDirectory,
};
