// 视频类型是否转码判断 配置文件

const path = require('path');
const fs=require('fs');

// video.js支持的视频类型
const supportedExtensions = ['.mp4', '.webm', '.ogg'];

function needsTranscoding(filePath) {
	try {
		// 检查文件是否存在
		if (!fs.existsSync(filePath)) {
			console.warn('文件不存在:', filePath);
			return true; // 文件不存在，跳过处理
		}

		const ext = path.extname(filePath).toLowerCase();
		
		// 暂时对所有视频文件都进行转码，确保完全兼容 Chromium
		// 这可以解决像素格式问题和编解码器兼容性问题
		const shouldTranscode = true;
		
		console.log(`文件: ${path.basename(filePath)}, 扩展名: ${ext}, 需要转码: ${shouldTranscode}`);
		
		return shouldTranscode;
	} catch (error) {
		console.error('检查文件转码需求失败:', error);
		return true; // 出错时假设需要转码
	}
}
// 获取转码后输出路径
function getOutputPath(filePath) {
    try {
        // 验证输入参数
        if (!filePath || typeof filePath !== 'string') {
            throw new Error(`无效的文件路径: ${filePath}`);
        }

        const base = path.basename(filePath, path.extname(filePath));
        const dir = path.dirname(filePath);
        const outputDir = path.join(dir, '..', 'convertedVideos');
        
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            try {
                fs.mkdirSync(outputDir, { recursive: true });
                console.log('创建转码输出目录:', outputDir);
            } catch (mkdirError) {
                console.error('创建目录失败:', mkdirError);
                // 如果无法创建目录，使用当前目录
                const fallbackPath = path.join(dir, `${base}_converted.mp4`);
                console.log('使用备用路径:', fallbackPath);
                return fallbackPath;
            }
        }
        
        // 修复：直接使用原文件名，不添加 _converted 后缀
        const outputPath = path.join(outputDir, `${base}.mp4`);
        console.log('转码输出路径:', outputPath);
        return outputPath;
    } catch (error) {
        console.error('生成输出路径失败:', error);
        // 返回一个备用路径而不是抛出错误
        const fallbackDir = path.dirname(filePath);
        const fallbackBase = path.basename(filePath, path.extname(filePath));
        return path.join(fallbackDir, `${fallbackBase}_converted.mp4`);
    }
}

module.exports = {
	needsTranscoding,
	getOutputPath,
	supportedExtensions
};