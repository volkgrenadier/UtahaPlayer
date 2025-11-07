// 视频类型是否转码判断 配置文件

const path = require('path');
const fs=require('fs');

// ✅ ffmpeg 和 HTML5 video 都支持的视频格式（不需要转码）
const supportedExtensions = [
	'.mp4',   // H.264/H.265
	'.webm',  // VP8/VP9
	'.ogg',   // Theora
	'.ogv',   // Ogg Video
	'.m4v',   // MPEG-4
];

function needsTranscoding(filePath) {
	try {
		// 检查文件是否存在
		if (!fs.existsSync(filePath)) {
			console.warn('文件不存在:', filePath);
			return false; // 文件不存在，不转码
		}

		const ext = path.extname(filePath).toLowerCase();
		
		// ✅ 只有不在支持列表中的格式才需要转码
		const shouldTranscode = !supportedExtensions.includes(ext);
		
		console.log(`文件: ${path.basename(filePath)}, 扩展名: ${ext}, 需要转码: ${shouldTranscode}`);
		
		return shouldTranscode;
	} catch (error) {
		console.error('检查文件转码需求失败:', error);
		return false; // 出错时不转码
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