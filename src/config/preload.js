const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// 向主进程发送信息

// 将electron API暴露给渲染进程
contextBridge.exposeInMainWorld('electronFeatures', {
    // 获取用户配置
    getUserConfig: (attrName) => ipcRenderer.invoke('get-userConfig', attrName),
    // 更新用户配置
    updateUserConfig: (attrName, value) => ipcRenderer.send('update-userConfig', { attrName, value }),
    // 选择音频文件
    selectAudioFiles: () => ipcRenderer.invoke('select-music-files'),
    
    // 获取音频信息 向主进程发送响应，告诉文件信息
    getAudioInfo: (filePath) => ipcRenderer.invoke('get-music-info', filePath),
    
    // 发送消息到主进程
    sendMessage: (channel, data) => {
        if (!channel) {
            console.warn('消息类型不可缺少');
            return;
        }
        return ipcRenderer.send(channel, data);
    },
    
    // 添加接收主进程消息的功能
    onMessage: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
        
        // 返回一个清理函数，用于移除监听器
        return () => {
            ipcRenderer.removeAllListeners(channel);
        };
    },
    
    // 获取音乐列表
    getMusicList: () => ipcRenderer.invoke('get-music-list'),

    // 加载歌词
    loadLyrics: (filePath) => ipcRenderer.invoke('load-lyrics', filePath),
    // 手动选择歌词文件
    selectLyricsFile: () => ipcRenderer.invoke('select-lyrics-file'),
    // 保存歌词关联
    saveLyricsAssociation: (musicId, lyricPath) => ipcRenderer.invoke('save-lyrics-association', { musicId, lyricPath }),

	// ! 视频
	// 选择视频文件
	selectVideoFiles: () => ipcRenderer.invoke('select-video-files'),
	// 获取音频信息 向主进程发送响应，告诉文件信息
    getVideoInfo: (filePath) => ipcRenderer.invoke('get-video-info', filePath),
	// 获取视频列表
	getVideoList:()=>ipcRenderer.invoke('get-video-list'),
	// 判断是否需要转码
	needsTranscoding:(filePath)=>ipcRenderer.invoke('check-video-support', filePath),
	// 获取输出路径
	getOutputPath: (filePath) => ipcRenderer.invoke('get-output-path', filePath),
	// 执行转码
	transcodeVideo: (inputPath, outputPath) => ipcRenderer.invoke('transcode-video', { inputPath, outputPath }),

});

console.log('Preload script has been loaded');

// 在windows下挂载