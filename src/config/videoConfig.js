// 视频类型是否转码判断 配置文件

const path = require('path');
const fs=require('fs');

// video.js支持的视频类型
const supportedExtensions = ['.mp4', '.webm', '.ogg'];
function needsTranscoding(filePath) {
	const ext = path.extname(filePath).toLowerCase();//后缀名小写
	return !supportedExtensions.includes(ext);
	// video不包含的话，则需要转码，返回true
}
// 获取转码后输出路径
function getOutputPath(filePath) {
	const base = path.basename(filePath, path.extname(filePath));//获取文件名
	const dir = path.dirname(filePath); //获取原文件所在目录
	const outputDir = path.join(dir,'..','convertedVideos')
	// 确保输出目录存在
	if(!fs.existsSync(outputDir)){
		fs.mkdirSync(outputDir);
	}
	return path.join(outputDir, base + '_converted.mp4');//转成mp4类型
}

module.exports = {
	needsTranscoding,
	getOutputPath,
	supportedExtensions
};