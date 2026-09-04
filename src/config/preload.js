const { contextBridge, ipcRenderer } = require('electron');

const ALLOWED_RENDERER_EVENTS = new Set([
    'library-updated',
    'music-list-updated',
    'video-list-updated',
    'photo-list-updated',
    'video-transcode-start',
    'video-transcode-success',
    'video-transcode-progress',
    'video-transcode-error',
])
const ALLOWED_CONFIG_SECTIONS = new Set(['music', 'video'])

// 向主进程发送信息
// 将electron API暴露给渲染进程
contextBridge.exposeInMainWorld('electronFeatures', {
    // 获取用户配置
    getUserConfig: (attrName) => {
        if (!ALLOWED_CONFIG_SECTIONS.has(attrName)) throw new TypeError('不允许读取该配置分区')
        return ipcRenderer.invoke('get-userConfig', attrName)
    },
    // 播放器偏好仅暴露固定字段，避免渲染层写入任意配置路径
    setMusicVolume: (value) => ipcRenderer.invoke('set-player-preference', { type: 'music', key: 'volume', value }),
    setMusicPlayerEffect: (value) => ipcRenderer.invoke('set-player-preference', { type: 'music', key: 'playerEffect', value }),
    setMusicPlaybackMode: (value) => ipcRenderer.invoke('set-player-preference', { type: 'music', key: 'playMode', value }),
    setVideoVolume: (value) => ipcRenderer.invoke('set-player-preference', { type: 'video', key: 'volume', value }),
    setVideoPlaybackMode: (value) => ipcRenderer.invoke('set-player-preference', { type: 'video', key: 'playMode', value }),
    // 统一媒体库（有界摘要，不返回整库 Base64）
    getHomeSummary: (options = {}) => ipcRenderer.invoke('get-home-summary', options),
    searchLibrary: (options = {}) => ipcRenderer.invoke('search-library', options),
    importMusicFolder: () => ipcRenderer.invoke('import-media-folder', 'music'),
    importVideoFolder: () => ipcRenderer.invoke('import-media-folder', 'video'),
    importPhotoFolder: () => ipcRenderer.invoke('import-media-folder', 'photo'),
    getRecentActivity: (options = {}) => ipcRenderer.invoke('get-recent-activity', options),
    getFavorites: (options = {}) => ipcRenderer.invoke('get-favorites', options),
    updatePlaybackProgress: (payload) => ipcRenderer.invoke('update-playback-progress', payload),
    recordMediaActivity: (payload) => ipcRenderer.invoke('record-media-activity', payload),
    setFavorite: (payload) => ipcRenderer.invoke('set-media-favorite', payload),
    // 选择音频文件
    selectAudioFiles: () => ipcRenderer.invoke('select-music-files'),
    
    // 获取音频信息 向主进程发送响应，告诉文件信息
    getAudioInfo: (filePath) => ipcRenderer.invoke('get-music-info', filePath),
    
    addMusicToLibrary: (items) => ipcRenderer.invoke('add-music-to-library', items),
    removeMusicFromLibrary: (mediaId) => ipcRenderer.invoke('remove-from-playlist', mediaId),
    addVideoToLibrary: (items) => ipcRenderer.invoke('add-video-to-library', items),
    removeVideoFromLibrary: (mediaId) => ipcRenderer.invoke('remove-from-videolist', mediaId),
    
    // 添加接收主进程消息的功能
    onMessage: (channel, callback) => {
        if (!ALLOWED_RENDERER_EVENTS.has(channel) || typeof callback !== 'function') {
            throw new TypeError('不允许订阅该主进程事件')
        }
        const listener = (event, ...args) => callback(...args)
        ipcRenderer.on(channel, listener)
        
        // 返回一个清理函数，用于移除监听器
        return () => {
            ipcRenderer.removeListener(channel, listener)
        }
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
    // 工具函数
    /**
     * @description 获取文件名（不含路径）
     * @param {string} filePath 文件路径
     * @returns {string} 文件名
     */
    getBaseName: (filePath) => String(filePath || '')
        .replace(/\\/g, '/')
        .split('/')
        .pop() || '',

    // 图片
    /**
     * @description 获取图片
     * @param {enum} openDirectoryOrFile 选择文件或目录，值为'directory' or 'file'，默认为'file'
     * @returns 
     */
    getImages: (openDirectoryOrFile) => {
        if (!openDirectoryOrFile) {
            openDirectoryOrFile = 'file'; // 默认选择文件
        }
        return ipcRenderer.invoke('get-images', openDirectoryOrFile)
    },
    /**
     * @description 获取图片列表幻灯片播放配置
     */
    getImageListShowConfig: () => ipcRenderer.invoke('get-imagelist-show-config'),
    /**
     * @description 更新图片列表缓存和播放数量配置
     * @param {number} photoPlayCount 播放数量，整数，范围 1-12
     * @returns 
     */
    updateSlideShowConfig: (imageList, photoPlayCount) => {
        let attrList = []
        let valueList = []
        if (photoPlayCount !== undefined) {
            attrList.push('photo.photoPlayCount');
            valueList.push(photoPlayCount);
        }
        if (imageList !== undefined) {
            attrList.push('photo.photoLibrary.slideImagesCache');
            valueList.push(imageList);
        }

        return ipcRenderer.invoke('update-slide-show-config',
            { 
                attrName: attrList,
                value: valueList
            }
        )
    },
    /**
     * @description 关闭图片幻灯片窗口
     */
    openSlideShow: (imageList, photoPlayCount) => ipcRenderer.invoke('open-slide-show', { imageList, photoPlayCount }),
    closeSlideShow: () => ipcRenderer.invoke('close-slide-show'),
    /**
     * @description 从本地删除图片文件
     */
    deleteImageFile: (filePath, updatedImageList) => {
        return ipcRenderer.invoke('delete-image-file', {
            filePath,
            updatedImageList
        });
    },
    saveEditedImage: (payload) => ipcRenderer.invoke('save-edited-image', payload)


});

// 在windows下挂载
