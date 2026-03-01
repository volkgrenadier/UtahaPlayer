const { nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// 缩略图尺寸（宽度），高度等比缩放
const THUMB_WIDTH = 300;

// 缩略图磁盘缓存目录（跨会话复用，避免每次启动重新生成）
const CACHE_DIR = path.join(os.tmpdir(), 'app-photo-thumbs');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * 根据文件路径 + 修改时间生成缓存 key，
 * 文件没变则命中缓存，无需重新生成。
 */
const getCacheKey = (filePath) => {
    const stat = fs.statSync(filePath);
    const raw = `${filePath}:${stat.mtimeMs}`;
    return crypto.createHash('md5').update(raw).digest('hex');
};

/**
 * 为单张图片生成缩略图，返回 base64 data URL。
 * 优先读取磁盘缓存；缓存不存在时用 nativeImage 生成并写入缓存。
 * @param {string} filePath  图片的绝对路径
 * @returns {string}  base64 data URL，失败时返回 null
 */
const generateThumb = (filePath) => {
    try {
        const cacheKey = getCacheKey(filePath);
        const cachePath = path.join(CACHE_DIR, `${cacheKey}.jpg`);

        // 命中磁盘缓存
        if (fs.existsSync(cachePath)) {
            const data = fs.readFileSync(cachePath);
            return `data:image/jpeg;base64,${data.toString('base64')}`;
        }

        // 用 nativeImage 加载并等比缩放
        const image = nativeImage.createFromPath(filePath);
        if (image.isEmpty()) return null;

        const { width, height } = image.getSize();
        const ratio = THUMB_WIDTH / width;
        const thumbHeight = Math.round(height * ratio);

        const resized = image.resize({ width: THUMB_WIDTH, height: thumbHeight, quality: 'good' });
        const jpegBuffer = resized.toJPEG(75); // quality 75，体积和清晰度的平衡点

        // 写入磁盘缓存
        fs.writeFileSync(cachePath, jpegBuffer);

        return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
    } catch (err) {
        console.error(`[thumbnailHelper] 生成缩略图失败: ${filePath}`, err);
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
 *       // 返回 [{ src: '/path/to/img.jpg', thumb: 'data:image/jpeg;base64,...' }, ...]
 *   });
 */
const attachThumbs = (imageList = []) => {
    return imageList.map((item) => ({
        ...item,
        thumb: generateThumb(item.src),
    }));
};

module.exports = { attachThumbs, generateThumb };