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
    // sendMessage: (channel, data) => {
    //     if (!channel) {
    //         console.warn('消息类型不可缺少');
    //         return;
    //     }
    //     return ipcRenderer.send(channel, data);
    // },
	
	sendMessage: (channel, data) => {
        if (!channel) {
            console.warn('消息类型不可缺少');
            return Promise.resolve();
        }
        // 对于需要返回值的操作，使用 invoke
        if (channel === 'check-file-exists') {
            return ipcRenderer.invoke(channel, data);
        }
        // 对于不需要返回值的操作，使用 send 但返回 Promise
        ipcRenderer.send(channel, data);
        return Promise.resolve();
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
	// 添加文件存在性检查函数
    checkFileExists: (filePath) => {
        return ipcRenderer.invoke('check-file-exists', filePath);
    },
	// 选择视频文件
	selectVideoFiles: () => ipcRenderer.invoke('select-video-files'),
	// 获取音频信息 向主进程发送响应，告诉文件信息
    getVideoInfo: (filePath) => ipcRenderer.invoke('get-video-info', filePath),
	// 获取视频列表
	getVideoList:()=>ipcRenderer.invoke('get-video-list'),
	// 判断是否需要转码
	needsTranscoding:(filePath)=>ipcRenderer.invoke('video-needs-transcoding', filePath),
	// 获取输出路径
	getOutputPath: (filePath) => ipcRenderer.invoke('get-output-path', filePath),
	// 执行转码
	transcodeVideo: (inputPath, outputPath) => ipcRenderer.invoke('transcode-video', { inputPath, outputPath }),

    // 工具函数
    /**
     * @description 获取文件名（不含路径）
     * @param {string} filePath 文件路径
     * @returns {string} 文件名
     */
    getBaseName: (filePath) => path.basename(filePath),

    // 图片
    /**
     * @description 获取图片信息
     * @param {string} filePath 图片文件路径
     * @returns 
     */
    getImagesInfo: (filePath) => ipcRenderer.invoke('get-images-info', filePath),

});

console.log('Preload script has been loaded');

// 在windows下挂载