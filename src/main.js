const { app, BrowserWindow, ipcMain, screen, Tray, Menu, dialog, protocol } = require('electron');
const { parseFile } = require('music-metadata') //node.js的库
const path = require('path');
const fs = require('fs');
const { lyricFileType } = require('./config/config.js')
const { musicFileType } = require('./config/config.js')
const {needsTranscoding,getOutputPath}=require("./config/videoConfig.js");
const ffmpeg = require('ffmpeg');
let ElectronStore;
let store;
let userSavedConfig;
let userConfig = {}
async function initStore() {
    ElectronStore = await import('electron-store').then(module => module.default)
    store = new ElectronStore()
    userSavedConfig = store.get('userConfig', {
        music: {
            // 存储音乐文件信息的对象
            musicLibrary: {
                musicList: [],
                musicFolders: []
            },
            volume: 25, // 音量范围 0-100
            playerEffect: 'ImmersiveLyrics' // 播放器效果
        },
		video:{
			// 存储视频文件信息的对象
			videoLibrary:{
				videoList:[],
				videoFolders:[]
			},
			volume:25
		}
    }) // 读取用户配置文件
    userConfig = userSavedConfig
}

let mainWindow = null;
let movingInterval = null;
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 16; // 约等于 60fps (1000/60 ≈ 16.67ms)
//  歌词文件类型列表
const lyricFileTypeList = lyricFileType.map(item => item.type)

/**
 * 应用级系统型事件处理函数
 */
//  关闭app
function closeApp() {
    app.quit()
}
//  最小化窗口
function minimizeWindow() { 
    mainWindow.minimize();
}
//  最大化窗口
function maximizeWindow() { 
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize(); //  true means window has been restored, for Header.js
    }
    else{
        mainWindow.maximize();   //  false means window has been maximized, for Header.js
    }
}
//  移动窗口
function moveWin(e,canMove) {    
    let winStartPosition = {x: 0, y: 0};
    let cursorStartPosition = {x: 0, y: 0};
    
    // console.log(canMove)
    if (canMove) {
        //  读取窗口原位置，每次调用函数的时候都要获取一次
        const winPosition = mainWindow.getPosition();
        winStartPosition = {x: winPosition[0], y: winPosition[1]};
        cursorStartPosition = screen.getCursorScreenPoint();
        
        // To avoid some unforeseeable bugs, for example changing window size while draging window
        //  get window size and position
        const windowBounds = mainWindow.getBounds()
        
        if (!movingInterval) {
            //  新增计时器
            
            movingInterval = setInterval(() => {
                const currentTime = Date.now();
                
                // 节流处理，确保不会更新太频繁
                if (currentTime - lastUpdateTime < UPDATE_INTERVAL) {
                    return;
                }
                lastUpdateTime = currentTime;
                
                // 获取当前鼠标位置
                const cursorNowPosition = screen.getCursorScreenPoint();
                
                // 计算新的窗口位置
                const winNewPosX = winStartPosition.x + cursorNowPosition.x - cursorStartPosition.x;
                const winNewPosY = winStartPosition.y + cursorNowPosition.y - cursorStartPosition.y;
                
                // 检查位置是否真的发生变化，避免不必要的更新
                if (windowBounds.x !== winNewPosX || windowBounds.y !== winNewPosY) {
                    // 为了防止拖动过程中的bug，使用setBounds
                    mainWindow.setBounds({
                        x: winNewPosX,
                        y: winNewPosY,
                        width: windowBounds.width,
                        height: windowBounds.height
                    })
                }
            }, 8)
        }
    }
    else{
        clearInterval(movingInterval);
        movingInterval = null;
    }
}
/**
 * @description 更新用户配置
 * @param {*} _ 
 * @param {*} dataObj 传入的对象，包含要更新的属性名称和对应的值，例如 { attrName: 'music.volume', value: 80 }
 */
function updateUserConfig(_, dataObj) {
    /**  
     *  逻辑：没有找到对应的属性就添加进去，找到就直接覆盖
     *  dataObj.attrName是一个字符串，表示要更新的属性名，例如 "music.volume"，可以利用这样的写法来修改对象的嵌套属性，
     *  dataObj.value是对应的值，例如 80
     *  如果传入的属性名称是数组，且值也是数组，则对修改的属性进行遍历修改
     *  例如 { attrName: ['music.volume', 'music.playerEffect'], value: [80, 'ImmersiveLyrics'] }
    */

    // 如果传入的属性名称是数组，且值也是数组，则对修改的属性进行遍历
    let needUpdateAttrArr = []
    let needUpdateValueArr = []
    if (Array.isArray(dataObj.attrName)) {
        for (const element of dataObj.attrName) {
            needUpdateAttrArr.push(element.split('.'))
        }
        for (let i = 0; i < needUpdateAttrArr.length; i++) {
            if (Array.isArray(dataObj.value)) {
                needUpdateValueArr.push(i > dataObj.value.length - 1? null: dataObj.value[i])
            } else {
                needUpdateValueArr.push(i > 0? null: dataObj.value)
            }
        }
    } else {
        needUpdateAttrArr.push(dataObj.attrName.split('.'))
        needUpdateValueArr.push(dataObj.value)
    }
    let newConfig = {
        ...userConfig
    }
    for (const key in needUpdateAttrArr) {
        let attrArr = needUpdateAttrArr[key]
        // 创建层级指示
        let current = newConfig
        // 遍历并逐层深入对象
        for (let i = 0; i < attrArr.length - 1; i++) {
            const key = attrArr[i]
            // 如果没有这个属性，则创建一个空对象
            if(current[key] === undefined) {
                current[key] = {}
            } else if(typeof current[key] !== 'object' || current[key] === null) {
                // 如果不是对象，则将其替换为对象
                current[key] = {}
            }
            current = current[key]
        }
        const finalKey = attrArr[attrArr.length - 1]
        if(current && finalKey) {
            
            current[finalKey] = needUpdateValueArr[key]
        }
        userConfig = {
            ...userConfig,
            ...newConfig
        }
    }
    // console.log('更新后的配置', JSON.stringify(userConfig.music.volume))
    //  更新配置文件
    store.set('userConfig', userConfig)
}
/**
 * 
 * @description  获取用户配置
 * @attrName {string} attrName 属性名称
 * @returns {any} 返回对应的属性值，如果没有传入属性名称，则返回整个配置对象
 * 
 */
function getUserConfig(e, attrName) {     
    let attrArr = attrName.split('.')
    let obj = {
        ...userConfig
    }
    // console.log('属性数组和obj', attrArr, obj)
    //  如果没有传入属性名称，直接返回整个配置对象
    if (!attrName) {
        return userConfig
    }
    //  如果传入了属性名称，返回对应的属性值
    for (let i = 0; i < attrArr.length; i++) {
        for (const key in obj) {
            if (key === attrArr[i]) {
                if(i === attrArr.length - 1) {
                    // 如果是最后一个属性，且成功获取到值，直接返回
                    return obj[attrArr[i]]

                } else {
                    // 如果不是最后一个属性，继续深入对象
                    obj = obj[attrArr[i]]
                }
            }
        }
        // 如果没有这个属性，则返回undefined
        return undefined
    }
    
}

/**
 * 模块事件处理
 */
// 获取音乐播放列表
function getMusicList() {
    return userConfig.music?.musicLibrary?.musicList || [];
}
// 查找音乐文件的完整路径
async function getMusicPath(event, filename) {
    for (const folder of userConfig.music.musicLibrary.musicFolders) {
        const filePath = path.join(folder, filename);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return null;
}
// 选择音乐文件
async function chooseMusicFile() {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '音频文件', extensions: musicFileType }
        ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
}

// 选择多个音乐文件 electron自带的文件选择 获取文件本地路径
async function chooseMusicFiles() {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections', 'showHiddenFiles'],
        filters: [
            { name: '音频文件', extensions: musicFileType }
        ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths;
    }
    return [];
}

// 获取音频文件信息
async function getMusicInfo(event, filePaths) {
    try {
        let musicArr = []
        for (let i = 0; i < filePaths.length; i++) {
            // 获取文件基本信息
            const stats = fs.statSync(filePaths[i]);
            const fileName = path.basename(filePaths[i]);
            const info = await parseFile(filePaths[i]);
            // console.log('歌曲meta data', info);
            // 尝试从文件名提取艺术家和标题信息
            let title = fileName;
            let artist = '未知艺术家';
            // 假设格式为 "艺术家 - 标题.扩展名"
            const match = fileName.match(/(.+)\s-\s(.+)\..+$/);
            if (match) {
                artist = match[1].trim();
                title = match[2].trim();
            }
            if(Object.hasOwn(info.common, 'title') && info.common.title ) {
                title = info.common.title
            }
            if(Object.hasOwn(info.common, 'artist') && info.common.artist) {
                artist = info.common.artist
            }
            // 处理封面图片
            let coverUrl = null;
            if (info.common.picture && info.common.picture.length > 0) {
                const picture = info.common.picture[0];
                const format = picture.format || 'jpeg';
                const base64Data = Buffer.from(picture.data).toString('base64');
                coverUrl = `data:image/${format};base64,${base64Data}`;
            }
            let musicInfoObj = {
                ...info.common,
                id: filePaths[i],
                path: filePaths[i],
                title: title,
                artist: artist,
                size: stats.size,
                modified: stats.mtime,
                coverUrl
            }
            musicArr.push(musicInfoObj)
        }
        return musicArr
    } catch (error) {
        console.error('获取音频信息失败:', error);
        return [];
    }
}
/**
 * @description 更新配置文件
 */
function updateSavedUserConfig() {
    store.set('userConfig', userConfig)
}
// 添加音乐到播放列表
function addMusicToLibrary(event, MusicList) {
    try {
            // console.log(MusicList)
            userConfig.music.musicLibrary.musicList = [...userConfig.music.musicLibrary.musicList, ...MusicList]
            updateSavedUserConfig()
            // 通知渲染进程
            if (mainWindow) {
                mainWindow.webContents.send('music-list-updated', userConfig.music.musicLibrary.musicList);
            }
    } catch (error) {
        console.error('添加音乐到播放列表失败:', error);
    }
    return null;
}

// 从播放列表中移除歌曲
function removeFromPlaylist(event, songId) {
    const index = userConfig.music.musicLibrary.musicList.findIndex(song => song.id === songId);
    if (index !== -1) {
        userConfig.music.musicLibrary.musicList.splice(index, 1);
        updateSavedUserConfig()
        // 通知渲染进程
        if (mainWindow) {
            mainWindow.webContents.send('music-list-updated', userConfig.music.musicLibrary.musicList);
        }
    }
}

// 加载歌词文件
async function loadLyricsFile(event, filePath) {
    try {
        // 尝试查找同名的.lrc文件
        const audioDir = path.dirname(filePath);
        const audioName = path.basename(filePath, path.extname(filePath));
        const possibleLrcPaths = [];
        for (const extName of lyricFileTypeList) {
            possibleLrcPaths.push(path.join(audioDir, `${audioName}.${extName}`)); // 同目录下的歌词
        }
        
        for (const index in possibleLrcPaths) {
            try {
                const stats = fs.statSync(possibleLrcPaths[index]);
                if (stats.isFile()) {
                    let content;
                    let handlerRes = {}
                    if (lyricFileType[index].handler) {
                        /**
                         * handlerRes应为以下格式：
                         * {
                                success: {boolean} 是否成功,
                                error: {string} 错误信息,
                                lyricPath: {string} 歌词文件路径,
                                info: {object} 解析后的歌词信息,
                                lyricStrData: {string} 歌词字符串数据,
                                extName: {string} 歌词文件扩展名,
                            }
                         */
                        handlerRes = lyricFileType[index].handler(possibleLrcPaths[index]);// 按照handler处理文件的结果
                        handlerRes.extName = lyricFileTypeList[index]; // 添加扩展名
                        if (handlerRes.success) {
                            content = handlerRes.lyricStrData; 
                        } else {
                            console.error('歌词解析失败:', handlerRes.error);
                            return {
                                lyricPath: possibleLrcPaths[index],
                                lyricData: [],
                            };
                        }
                    } else {
                        content = fs.readFileSync(possibleLrcPaths[index], 'utf8');
                    }
                    
                    return {
                        ...handlerRes,
                        lyricPath: possibleLrcPaths[index],
                        lyricData: parseLyrics(content),
                    }
                }
            } catch (err) {
                // 文件不存在，继续检查下一个可能路径
                console.log('歌词文件不存在:', possibleLrcPaths[index]);
                continue;
            }
        }
        
        // 检查歌曲是否有关联的歌词文件路径
        const musicDb = userConfig.music.musicLibrary.musicList
        const musicEntry = musicDb.find(m => m.path === filePath);
        if (musicEntry && musicEntry.lyricsPath) {
            try {
                const content = await fs.readFileSync(musicEntry.lyricsPath, 'utf8');
                return parseLyrics(content);
            } catch (err) {
                console.error('读取关联歌词文件失败:', err);
            }
        }
        
        return {
            lyricPath: '',
            lyricData: [],
        } // 未找到歌词文件
    } catch (error) {
        console.error('加载歌词文件失败:', error);
        return {
            lyricPath: '',
            lyricData: [],
        }
    }
}

// 解析LRC格式歌词
function parseLyrics(lrcContent) {
    if (!lrcContent) return [];
    const lines = lrcContent.split('\n');
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    const lyrics = [];
    
    lines.forEach(line => {
        // 跳过空行和不含时间标签的行
        if (!line.trim() || !timeRegex.test(line)) return;
        
        // 提取所有时间标签及文本
        const timeMatches = line.match(/\[\d{2}:\d{2}\.\d{2,3}\]/g);
        const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
        
        if (text && timeMatches) {
            timeMatches.forEach(timeStr => {
            const match = timeStr.match(timeRegex);
            if (match) {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const ms = parseInt(match[3].padEnd(3, '0'));
                // 转换为秒数
                const timeInSeconds = min * 60 + sec + ms / 1000;
                lyrics.push({
                    time: timeInSeconds,
                    text: text
                });
            }
            });
        }
    });
    
    // 按时间排序
    return lyrics.sort((a, b) => a.time - b.time);
}

// 选择歌词文件
async function selectLyricsFile() {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: '歌词文件', extensions: lyricFileTypeList }]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        try {
            const filePath = result.filePaths[0]
            let content;
            let handlerRes = {}
            let index = -1 // 当前歌词文件类型的索引
            for (let i = 0; i < lyricFileTypeList.length; i++) {
                let extNameRegStr = `\.(${lyricFileTypeList[i]})$`
                let extNameReg = new RegExp(extNameRegStr, 'i')
                if (extNameReg.test(filePath)) {
                    index = i
                    break
                }
            }
            if (index !== -1 && lyricFileType[index].handler) {
                /**
                 * handlerRes应为以下格式：
                 * {
                        success: {boolean} 是否成功,
                        error: {string} 错误信息,
                        lyricPath: {string} 歌词文件路径,
                        info: {object} 解析后的歌词信息,
                        lyricStrData: {string} 歌词字符串数据,
                        extName: {string} 歌词文件扩展名,
                    }
                    */
                console.log('得到的index',index, lyricFileType[index].handler)
                handlerRes = await lyricFileType[index].handler(filePath);// 按照handler处理文件的结果
                handlerRes.extName = lyricFileTypeList[index]; // 添加扩展名
                console.log('处理结果', JSON.stringify(handlerRes))
                if (handlerRes.success) {
                    content = handlerRes.lyricStrData; 
                } else {
                    console.error('歌词解析失败:', handlerRes.error);
                    return {
                        lyricPath: filePath,
                        lyricData: [],
                    };
                }
            } else {
                content = fs.readFileSync(filePath, 'utf8');
                console.log(content)
            }
            
            return {
                handlerRes: {
                    ...handlerRes
                },
                lyricPath: filePath,
                lyricData: parseLyrics(content),
            }
        } catch (error) {
            console.error('读取歌词文件失败:', error);
            return {
                lyricPath: '',
                lyricData: [],
            }
        }
    }
    return {
        lyricPath: '',
        lyricData: [],
    }
}

// 保存歌词关联
async function saveLyricsAssociation(event, { musicId, lyricPath }) {
    try {
        const index = userConfig.music.musicLibrary.musicList.findIndex(m => m.id === musicId);
        if (index !== -1) {
            userConfig.music.musicLibrary.musicList[index].lyricPath = lyricPath;
            updateSavedUserConfig()
            // 通知渲染进程
            if (mainWindow) {
                await mainWindow.webContents.send('music-list-updated', userConfig.music.musicLibrary.musicList);
            }
            return {
                success: true,
                message: '歌词关联保存成功'
            }
        }
        return {
            success: false,
            message: '未找到对应的音乐文件'
        };
    } catch (error) {
        console.error('保存歌词关联失败:', error);
        return {
            success: false,
            message: '保存歌词关联失败'
        };
    }
  }

//  添加事件监听
function listenEvent() {  
    ipcMain.on('close-window', closeApp) //  shutdown application
    ipcMain.on('minimize-window', minimizeWindow)    //  listen the event for minimize application window
    ipcMain.on('maximize-window', maximizeWindow)//  listen the event for maximize or restore application window
    ipcMain.on('window-move-open', moveWin) //   listen the event for drag window
    

    // 用户配置相关处理程序
    ipcMain.on('update-userConfig', updateUserConfig)   //  监听更改用户配置的事件，这是临时更改，对于文件修改会在程序关闭前进行修改
    ipcMain.handle('get-userConfig', getUserConfig); // 获取用户配置

    // 添加音频相关处理程序
    ipcMain.handle('get-music-list', getMusicList)  //  获取播放列表
    ipcMain.handle('get-music-file-path', getMusicPath) // 获取音乐文件路径
    ipcMain.handle('select-audio-file', chooseMusicFile); // 选择单个音频文件
    ipcMain.handle('select-music-files', chooseMusicFiles); // 选择多个音频文件
    ipcMain.handle('get-music-info', getMusicInfo); // 获取音频信息 
    ipcMain.on('remove-from-playlist', (event, songId) => {
        removeFromPlaylist(event, songId);
    });
    ipcMain.on('add-music-to-library', addMusicToLibrary)

    // 添加歌词相关处理程序
    ipcMain.handle('load-lyrics', loadLyricsFile); // 加载歌词文件
    ipcMain.handle('select-lyrics-file', selectLyricsFile); // 选择歌词文件
    ipcMain.handle('save-lyrics-association', saveLyricsAssociation); // 保存歌词关联

	// ========视频处理==============
	ipcMain.handle('get-video-list', getVideoList)  //  获取播放列表
	ipcMain.handle('get-video-file-path', getVideoPath) // 获取视频文件路径
	ipcMain.handle('select-video-file', chooseVideoFile); // 选择单个视频文件
    ipcMain.handle('select-video-files', chooseVideoFiles); // 选择多个视频文件
    ipcMain.handle('get-video-info', getVideoInfo); // 获取视频信息 
    ipcMain.on('remove-from-videolist', (event, songId) => {
        removeFromVideolist(event, songId);
    });
    ipcMain.on('add-video-to-library', addVideoToLibrary)

	// 判断是否需要转码
	ipcMain.handle('video-needs-transcoding', (event,filePath)=>{
		return needsTranscoding(filePath);
	});
	// 获取转码输出路径
	ipcMain.handle('get-output-path', (event, filePath) => {
		return getOutputPath(filePath);
	});
	// 转码
	ipcMain.handle('transcode-video',transcodeVideo)
}

// 获取视频播放列表
function getVideoList(){
	return userConfig.video?.videoLibrary?.videoList || [];
}
// 查找视频文件完整路径
async function getVideoPath(event, filename) {
	for(const folder of userConfig.video.videoLibrary.videoFolders){
		const filePath = path.join(folder,filename);
		if(fs.existsSync(filePath)){
			return filePath;
		}
	}
	return null;
}
// 选择视频文件
async function chooseVideoFile() {
	const result = await dialog.showOpenDialog(mainWindow,{
		properties:['openFile'],//选择文件
		filters:[
			{name:'视频',extensions:['mp4','webm', 'ogg']}
		]
	})
	if(!result.canceled && result.filePaths.length>0){
			const originalPath = result.filePaths[0];
			//判断是否需要转码
			if(needsTranscoding(originalPath)){
				try{
					const convertedPath = await transcodeVideo(originalPath);
					return convertedPath;
				}catch(err){
					console.err("转码失败：",err);
					return null;
				}
			}
			// 不需要转码，直接返回原路径
			return originalPath;
	}
	
	return null;
}
// 选择多个视频文件
async function chooseVideoFiles() {
	const result = await dialog.showOpenDialog(mainWindow, {
		properties: ['openFile', 'multiSelections'],
		filters: [
			{ name: '视频文件', extensions: ['mp4', 'webm', 'ogg', 'mkv', 'avi'] }
		]
	});

	if(!result.canceled && result.filePaths.length > 0){
		const processedPaths = [];
		for (const filePath of result.filePaths) {
			if (needsTranscoding(filePath)) {
				try {
					const convertedPath = await transcodeVideo(filePath);
					processedPaths.push(convertedPath);
				} catch (err) {
					console.error('转码失败:', err);
				}
			} else {
				processedPaths.push(filePath);
			}
		}
		return processedPaths;
	}
	return [];
}
// 转码
async function transcodeVideo(event,filePath){
	try{
		const outputPath = getOutputPath(filePath);
		return await new Promise((resolve,reject)=>{
			ffmpeg(filePath)
				.outputOptions('-preset veryfast') // 可选：加快转码速度
				.videoCodec('libx264')
				.format('mp4')
				.output(outputPath)
				.on('end', () => {
					console.log('视频转码完成:', outputPath);
					resolve(outputPath); // 成功返回转码后路径
				})
				.on('error', (err) => {
					console.error('视频转码失败:', err.message);
					reject(err); // 转码失败
				})
				.run();
		})
	}catch(err){
		console.error('转码异常:', err);
		throw err;
	}
}

// 获取视频信息 ???
async function getVideoInfo(event,filePath) {
	try{
		const videoArr=[];

		for(const filePath of filePaths){
			// 获取文件基本信息
			const stats = fs.statSync(filePath[i]);
			const fileName = path.basename(filePaths[i]);
			// 获取视频元数据
			const metadata = await new Promise((resolve,reject)=>{
				ffmpeg.ffprobe(filePath,(err,data)=>{
					if(err) reject(err);
					else resolve(data);
				})
			})
			const videoStream = metadata.streams.find(s=>s.codec_type === 'video');

			const title = fileName;
			// 获取视频流使用的编解码器，比如 h264、vp9。
			const codec = videoStream?.codec_name || 'unknown';
			// 获取视频宽度和高度（分辨率）
			const width = videoStream?.width || 0;
			const height = videoStream?.height || 0;
			// 视频总时长
			const duration = metadata.format.duration || 0;
			// 视频比特率 代表视频质量/大小，单位是 bps
			const bitrate = metadata.format.bit_rate || 0;
			// 文件大小 最后修改时间
			const size = stats.size;
			const modified = stats.mtime;

			const videoInfoObj={
				id:filePath,
				path:filePath,
				title,
				codec,
				width,
				height,
				duration,
				bitrate,
				size,
				modified,
				format: metadata.format.format_long_name || metadata.format.format_name,
				filename: metadata.format.filename
			};
			videoArr.push(videoInfoObj);
		}
		return videoArr;
	}catch(error){
		console.log('获取视频信息失败：', error);
		return [];
	}
}

// 添加视频到播放列表
function addVideoToLibrary(event,videoList){
	try{
		// 合并视频列表
        userConfig.video.videoLibrary.videoList = [
            ...userConfig.video.videoLibrary.videoList,
            ...videoList
        ];
        updateSavedUserConfig();

        // 通知渲染进程视频列表更新
        if (mainWindow) {
            mainWindow.webContents.send(
                'video-list-updated',
                userConfig.video.videoLibrary.videoList
            );
        }
	}catch(err){
		console.error('添加视频到播放列表失败:', error);
	}
	return null;
}
// 音视频在一个播放列表还是分开？
// 从播放列表中移除视频
function removeFromVideolist(event,videoId){
	const index = userConfig.video.videoLibrary.videoList.findIndex(
			video => video.id === videoId
		);
	if (index !== -1) {
        userConfig.video.videoLibrary.videoList.splice(index, 1);
        updateSavedUserConfig();

        // 通知渲染进程更新
        if (mainWindow) {
            mainWindow.webContents.send(
                'video-list-updated',
                userConfig.video.videoLibrary.videoList
            );
        }
    }
}

function createWindow() {   //  创建窗口
    const windowOptions = {
        width : 1200,
        minWidth: 1200,
        height: 700,
        minHeight: 700,
        show: false,
        frame: false,//  是否创建无边框窗口
        devTools: true,
        webPreferences: {
            preload: path.join(__dirname, 'config/preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
            webSecurity: false
        },
        icon: path.join(__dirname, 'component/icon/utaha_min.png'),
    }
    mainWindow = new BrowserWindow(windowOptions);
    mainWindow.title = 'Utaha Music';
    mainWindow.loadURL("http://localhost:3000/");
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    
    // 开发环境打开开发工具
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

function createTray() {     //  创建系统通知区图标和菜单
    let iconPath = path.join(__dirname, '/component/icon/utaha_min.png')
    let appTrayIcon = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
        { label: '设置', type: 'normal'},
        { label: '退出', type: 'normal', click: closeApp}
    ])
    appTrayIcon.setToolTip('Utaha Music');
    appTrayIcon.setContextMenu(contextMenu);
}

// 应用启动时创建窗口
app.on('ready', async () => {
    await initStore(); // 初始化配置存储
    createWindow();
});

// 应用准备就绪后设置协议和监听器
app.whenReady().then(() => {
    
    console.log('协议和处理程序注册完成');
    listenEvent();
    // createTray(); // 取消注释以启用系统托盘
});

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// 在macOS上，点击dock图标时如果没有其他窗口打开则再创建一个窗口
app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason) => {
    console.error('未处理的Promise拒绝:', reason);
});