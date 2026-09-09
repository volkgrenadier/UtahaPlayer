const { app, BrowserWindow, ipcMain, dialog, protocol, nativeImage } = require('electron');
const isInstallerStartup = require('electron-squirrel-startup');
if (isInstallerStartup) app.quit();
const { parseFile } = require('music-metadata') //node.js的库
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { fileURLToPath } = require('url');
const { lyricFileType, musicFileType } = require('./config/config.js')
const { needsTranscoding, getOutputPath } = require("./config/videoConfig.js");
const { imageTypeList } = require('./config/photoConfig.js');
const { createMainWindowOptions } = require('./main/windowOptions.js');
const { collectMediaFiles } = require('./main/mediaImportHelpers.js');
const { resolveBinaryPath } = require('./main/binaryPaths.js');

const ffmpeg = require('fluent-ffmpeg');
const ffprobeStatic = require('ffprobe-static');
const ffmpegStatic = require('ffmpeg-static');

const {
	attachThumbs,
	generateThumb,
	generateThumbFromDataUrl,
	setThumbnailCacheDirectory,
} = require('./thumbnailHelper.js');
const {
	buildHomeSummary,
	findMediaRecord,
	getFavorites,
	getPathKey,
	getRecentActivity,
	migrateUserConfig,
	recordMediaActivity,
	removeMediaRecord,
	replaceMediaRecords,
	searchLibrary,
	setMediaFavorite,
	syncLegacyLibraries,
	toMediaSummary,
	updatePlaybackProgress,
	upsertMediaRecords,
} = require('./main/mediaLibrary.js');
const { getEditedCopyDefaultName, rasterToBuffer, writeFileAtomically } = require('./main/imageSaveHelpers.js');

function normalizeFilePathForFs(filePath) {
	if (!filePath || typeof filePath !== 'string') return '';
	if (/^file:\/\//i.test(filePath)) {
		return fileURLToPath(filePath);
	}
	return filePath;
}

const ffmpegExport = ffmpegStatic; // ffmpeg-static 通常直接导出路径字符串
const ffprobeExport = ffprobeStatic && ffprobeStatic.path ? ffprobeStatic.path : ffprobeStatic;

const ffmpegPathResolved = resolveBinaryPath(ffmpegExport);
const ffprobePathResolved = resolveBinaryPath(ffprobeExport);

ffmpeg.setFfmpegPath(ffmpegPathResolved);
ffmpeg.setFfprobePath(ffprobePathResolved);


let ElectronStore;
let store;
let userSavedConfig;
let userConfig = {}

function migrateEmbeddedThumbnailUrls(config) {
	const photos = config?.photo?.photoLibrary?.slideImagesCache;
	if (!Array.isArray(photos)) return;
	for (const photo of photos) {
		if (typeof photo?.thumb !== 'string' || !photo.thumb.startsWith('data:image/')) continue;
		const filePath = photo.path || photo.src;
		const cachedUrl = generateThumbFromDataUrl(photo.thumb, filePath || crypto.randomUUID());
		if (cachedUrl) {
			photo.thumbnailUrl = cachedUrl;
			photo.thumb = cachedUrl;
		}
	}
}

function migrateCanonicalEmbeddedThumbnails(config) {
	for (const record of config?.mediaLibrary?.records || []) {
		const embeddedUrl = [record.thumbnailUrl, record.thumb, record.coverUrl]
			.find((value) => typeof value === 'string' && value.startsWith('data:image/'));
		if (!embeddedUrl) continue;
		const cachedUrl = generateThumbFromDataUrl(embeddedUrl, record.path || record.id);
		record.thumbnailUrl = cachedUrl || null;
		if (record.type === 'music') record.coverUrl = cachedUrl || null;
		delete record.thumb;
	}
}

function updateMediaThumbnail(record, options = {}) {
	if (!record) return false;
	let thumbnailUrl = record.thumbnailUrl;
	if (record.type === 'photo' && fs.existsSync(record.path)) {
		thumbnailUrl = generateThumb(record.path, options);
	} else if (typeof record.coverUrl === 'string' && record.coverUrl.startsWith('data:image/')) {
		thumbnailUrl = generateThumbFromDataUrl(record.coverUrl, record.id, options);
	}
	if (!thumbnailUrl || thumbnailUrl === record.thumbnailUrl) return false;
	record.thumbnailUrl = thumbnailUrl;
	if (record.type === 'music' && typeof record.coverUrl === 'string' && record.coverUrl.startsWith('data:')) {
		record.coverUrl = thumbnailUrl;
	}
	return true;
}

function persistUserConfig(nextConfig = userConfig) {
	userConfig = syncLegacyLibraries(nextConfig);
	store.set('userConfig', userConfig);
}

function notifyLibraryUpdated(type) {
	if (!mainWindow || mainWindow.isDestroyed()) return;
	mainWindow.webContents.send(`${type}-list-updated`, (
		type === 'music'
			? userConfig.music.musicLibrary.musicList
			: type === 'video'
				? userConfig.video.videoLibrary.videoList
				: userConfig.photo.photoLibrary.slideImagesCache
	));
	mainWindow.webContents.send('library-updated', { type });
}

function hydrateSummariesWithThumbnails(items) {
	let changed = false;
	for (const item of Array.isArray(items) ? items : []) {
		const record = findMediaRecord(userConfig, item.id, item.type);
		if (!record) continue;
		changed = updateMediaThumbnail(record) || changed;
		item.thumbnailUrl = record.thumbnailUrl || null;
		item.thumb = record.thumbnailUrl || null;
		if (item.type === 'music') item.coverUrl = record.thumbnailUrl || null;
	}
	if (changed) persistUserConfig();
	return items;
}

async function initStore() {
	ElectronStore = await import('electron-store').then(module => module.default)
	store = new ElectronStore()
	setThumbnailCacheDirectory(path.join(app.getPath('userData'), 'thumbnails'));
	userSavedConfig = store.get('userConfig', {
		music: {
			// 存储音乐文件信息的对象
			musicLibrary: {
				musicList: [],
				musicFolders: []
			},
			volume: 25, // 音量范围 0-100
			playerEffect: 'VinylPlayer' // 播放器效果
		},
		video: {
			// 存储视频文件信息的对象
			videoLibrary: {
				videoList: [],
				videoFolders: []
			},
			volume: 25
		},
		photo: {
			photoLibrary: {
				slideImagesCache: [],
			},
			photoPlayCount: 4
		}
	}) // 读取用户配置文件
	migrateEmbeddedThumbnailUrls(userSavedConfig);
	userConfig = migrateUserConfig(userSavedConfig);
	migrateCanonicalEmbeddedThumbnails(userConfig);
	persistUserConfig();
}

let mainWindow = null;
let slideWindow = null
//  歌词文件类型列表
const lyricFileTypeList = lyricFileType.map(item => item.type)
const videoFileTypeList = ['mp4', 'webm', 'ogg', 'ogv', 'm4v', 'mkv', 'avi'];
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
				needUpdateValueArr.push(i > dataObj.value.length - 1 ? null : dataObj.value[i])
			} else {
				needUpdateValueArr.push(i > 0 ? null : dataObj.value)
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
			if (current[key] === undefined) {
				current[key] = {}
			} else if (typeof current[key] !== 'object' || current[key] === null) {
				// 如果不是对象，则将其替换为对象
				current[key] = {}
			}
			current = current[key]
		}
		const finalKey = attrArr[attrArr.length - 1]
		if (current && finalKey) {

			current[finalKey] = needUpdateValueArr[key]
		}
		userConfig = {
			...userConfig,
			...newConfig
		}
	}
	const attrNames = Array.isArray(dataObj.attrName) ? dataObj.attrName : [dataObj.attrName];
	const attrValues = Array.isArray(dataObj.attrName) && Array.isArray(dataObj.value)
		? dataObj.value
		: [dataObj.value];
	const photoListIndex = attrNames.indexOf('photo.photoLibrary.slideImagesCache');
	if (photoListIndex !== -1 && Array.isArray(attrValues[photoListIndex])) {
		userConfig = replaceMediaRecords(userConfig, 'photo', attrValues[photoListIndex]);
	}
	persistUserConfig();
}
/**
 * 
 * @description  获取用户配置
 * @attrName {string} attrName 属性名称
 * @returns {any} 返回对应的属性值，如果没有传入属性名称，则返回整个配置对象
 * 
 */
function getUserConfig(e, attrName) {
	if (!attrName) return userConfig;
	let attrArr = attrName.split('.')
	let obj = {
		...userConfig
	}
	// console.log('属性数组和obj', attrArr, obj)
	//  如果传入了属性名称，返回对应的属性值
	for (let i = 0; i < attrArr.length; i++) {
		for (const key in obj) {
			if (key === attrArr[i]) {
				if (i === attrArr.length - 1) {
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
			if (Object.hasOwn(info.common, 'title') && info.common.title) {
				title = info.common.title
			}
			if (Object.hasOwn(info.common, 'artist') && info.common.artist) {
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
	persistUserConfig(migrateUserConfig(userConfig));
}
// 添加音乐到播放列表
function addMusicToLibrary(event, MusicList) {
	try {
		userConfig = upsertMediaRecords(userConfig, 'music', MusicList, { markImported: true });
		for (const item of Array.isArray(MusicList) ? MusicList : []) {
			const record = findMediaRecord(userConfig, item.path || item.id, 'music');
			updateMediaThumbnail(record);
		}
		persistUserConfig();
		notifyLibraryUpdated('music');
	} catch (error) {
		console.error('添加音乐到播放列表失败:', error);
	}
	return null;
}

// 从播放列表中移除歌曲
function removeFromPlaylist(event, songId) {
	const existing = findMediaRecord(userConfig, songId, 'music');
	if (existing) {
		userConfig = removeMediaRecord(userConfig, 'music', songId);
		persistUserConfig();
		notifyLibraryUpdated('music');
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
			const lyricPath = possibleLrcPaths[index];
			if (!fs.existsSync(lyricPath)) {
				continue;
			}

			try {
				const stats = fs.statSync(lyricPath);
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
						handlerRes = lyricFileType[index].handler(lyricPath);// 按照handler处理文件的结果
						handlerRes.extName = lyricFileTypeList[index]; // 添加扩展名
						if (handlerRes.success) {
							content = handlerRes.lyricStrData;
						} else {
							console.error('歌词解析失败:', handlerRes.error);
							return {
								lyricPath,
								lyricData: [],
							};
						}
					} else {
						content = fs.readFileSync(lyricPath, 'utf8');
					}

					return {
						...handlerRes,
						lyricPath,
						lyricData: parseLyrics(content),
					}
				}
			} catch (err) {
				console.warn('读取候选歌词文件失败:', lyricPath, err.message);
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
				let extNameRegStr = `\\.(${lyricFileTypeList[i]})$`
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
				handlerRes = await lyricFileType[index].handler(filePath);// 按照handler处理文件的结果
				handlerRes.extName = lyricFileTypeList[index]; // 添加扩展名
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


// 图片部分
/**
 * @description 处理图片和目录获取事件
 * @param {*} event 
 * @param {enum} openDirectoryOrFile 选择文件或目录，传入值为'directory' or 'file'，默认为'file'
 */
async function handleImageRequest(event, openDirectoryOrFile) {
    let imageFiles = []; // 存放原始路径字符串
    if (openDirectoryOrFile === 'directory') {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const dirPath = result.filePaths[0];
            imageFiles = await collectMediaFiles(dirPath, imageTypeList);
        }
    } else {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile', 'multiSelections'],
            filters: [{ name: '图片文件', extensions: imageTypeList }]
        });
        if (!result.canceled && result.filePaths.length > 0) {
            imageFiles.push(...result.filePaths);
        }
    }

	const selectedPathKeys = new Set(imageFiles.map(getPathKey));
	const imageObjects = attachThumbs(imageFiles.map((filePath) => ({
		src: filePath,
		path: filePath,
		title: path.basename(filePath, path.extname(filePath)),
	})));
	userConfig = upsertMediaRecords(userConfig, 'photo', imageObjects, { markImported: true });
	persistUserConfig();
	notifyLibraryUpdated('photo');

	return userConfig.photo.photoLibrary.slideImagesCache.filter((record) => (
		selectedPathKeys.has(getPathKey(record.path))
	));
}

function rememberLibraryFolder(type, folderPath) {
	const configPath = type === 'music'
		? 'music.musicLibrary.musicFolders'
		: type === 'video'
			? 'video.videoLibrary.videoFolders'
			: 'photo.photoLibrary.photoFolders';
	const currentFolders = getUserConfig(null, configPath) || [];
	if (currentFolders.some((item) => getPathKey(item) === getPathKey(folderPath))) return;
	updateUserConfig(null, {
		attrName: configPath,
		value: [...currentFolders, folderPath],
	});
}

async function importMediaFolder(event, type) {
	const extensionMap = {
		music: musicFileType,
		video: videoFileTypeList,
		photo: imageTypeList,
	};
	if (!Object.hasOwn(extensionMap, type)) {
		throw new TypeError('不支持的媒体文件夹类型');
	}

	const result = await dialog.showOpenDialog(mainWindow, {
		title: `添加${type === 'music' ? '音乐' : type === 'video' ? '视频' : '图片'}文件夹`,
		properties: ['openDirectory'],
	});
	if (result.canceled || !result.filePaths[0]) {
		return { status: 'canceled', count: 0 };
	}

	const folderPath = result.filePaths[0];
	const filePaths = await collectMediaFiles(folderPath, extensionMap[type]);
	let importedCount = 0;

	if (type === 'music') {
		const musicItems = await getMusicInfo(null, filePaths);
		addMusicToLibrary(null, musicItems);
		importedCount = musicItems.length;
	} else if (type === 'video') {
		const processedPaths = await processVideoFilePaths(filePaths);
		const videoItems = await getVideoInfo(null, processedPaths);
		addVideoToLibrary(null, videoItems);
		importedCount = videoItems.length;
	} else {
		const photoItems = filePaths.map((filePath) => {
			const stats = fs.statSync(filePath);
			return {
				path: filePath,
				src: filePath,
				title: path.basename(filePath, path.extname(filePath)),
				size: stats.size,
				modified: stats.mtime.toISOString(),
			};
		});
		userConfig = upsertMediaRecords(userConfig, 'photo', photoItems, { markImported: true });
		persistUserConfig();
		notifyLibraryUpdated('photo');
		importedCount = photoItems.length;
	}

	rememberLibraryFolder(type, folderPath);
	return { status: 'imported', count: importedCount };
}

function collectHomeSummaryItems(summary) {
	const allItems = [
		summary.nowPlaying,
		...(summary.continueItems || []),
		...(summary.recentItems || []),
		...(summary.recentAdded || []),
		...Object.values(summary.libraries || {}).flat(),
	].filter(Boolean);
	return [...new Map(allItems.map((item) => [item.id, item])).values()];
}

function getHomeSummaryHandler(event, options = {}) {
	const summary = buildHomeSummary(userConfig, options || {});
	hydrateSummariesWithThumbnails(collectHomeSummaryItems(summary));
	return summary;
}

function searchLibraryHandler(event, options = {}) {
	return hydrateSummariesWithThumbnails(searchLibrary(userConfig, options || {}));
}

function getRecentActivityHandler(event, options = {}) {
	return hydrateSummariesWithThumbnails(getRecentActivity(userConfig, options || {}));
}

function getFavoritesHandler(event, options = {}) {
	return hydrateSummariesWithThumbnails(getFavorites(userConfig, options || {}));
}

function updatePlaybackProgressHandler(event, payload) {
	try {
		userConfig = updatePlaybackProgress(userConfig, payload);
		persistUserConfig();
		const record = findMediaRecord(userConfig, payload?.mediaId, payload?.type);
		return { status: 'updated', media: record ? toMediaSummary(record) : null };
	} catch (error) {
		return {
			status: 'error',
			code: error.message === 'MEDIA_NOT_FOUND' ? 'MEDIA_NOT_FOUND' : 'INVALID_PLAYBACK_PROGRESS',
			message: error.message === 'MEDIA_NOT_FOUND' ? '未找到对应媒体' : '无法更新播放进度',
		};
	}
}

function recordMediaActivityHandler(event, payload) {
	try {
		userConfig = recordMediaActivity(userConfig, {
			...payload,
			mediaId: payload?.mediaId || payload?.path,
		});
		persistUserConfig();
		return { status: 'updated' };
	} catch (error) {
		return { status: 'error', code: 'MEDIA_NOT_FOUND', message: '未找到对应媒体' };
	}
}

function setMediaFavoriteHandler(event, payload) {
	try {
		userConfig = setMediaFavorite(userConfig, {
			...payload,
			mediaId: payload?.mediaId || payload?.path,
		});
		persistUserConfig();
		if (payload?.type) notifyLibraryUpdated(payload.type);
		const record = findMediaRecord(userConfig, payload?.mediaId || payload?.path, payload?.type);
		return { status: 'updated', media: record ? toMediaSummary(record) : null };
	} catch (error) {
		return { status: 'error', code: 'MEDIA_NOT_FOUND', message: '未找到对应媒体' };
	}
}

const MAX_EDITED_IMAGE_BYTES = 250 * 1024 * 1024;
const activeImageSaves = new Set();

function encodeEditedRaster(raster, format) {
	const inputBuffer = rasterToBuffer(raster);
	if (!inputBuffer?.length) {
		const error = new Error('编辑结果为空');
		error.code = 'EMPTY_RASTER';
		throw error;
	}
	if (inputBuffer.length > MAX_EDITED_IMAGE_BYTES) {
		const error = new Error('编辑结果超过 250 MB 限制');
		error.code = 'RASTER_TOO_LARGE';
		throw error;
	}

	const image = nativeImage.createFromBuffer(inputBuffer);
	if (image.isEmpty()) {
		const error = new Error('无法解码编辑结果');
		error.code = 'INVALID_RASTER';
		throw error;
	}
	const output = format === 'jpeg' ? image.toJPEG(92) : image.toPNG();
	if (!output.length || nativeImage.createFromBuffer(output).isEmpty()) {
		const error = new Error('无法编码编辑结果');
		error.code = 'ENCODE_FAILED';
		throw error;
	}
	return output;
}

function inferEditedImageFormat(sourcePath, requestedFormat) {
	if (requestedFormat === 'png' || requestedFormat === 'jpeg') return requestedFormat;
	return /^\.jpe?g$/i.test(path.extname(sourcePath)) ? 'jpeg' : 'png';
}

function saveErrorResult(error) {
	const knownCodes = new Set([
		'EMPTY_RASTER',
		'RASTER_TOO_LARGE',
		'INVALID_RASTER',
		'ENCODE_FAILED',
		'VERIFY_FAILED',
		'ROLLBACK_FAILED',
	]);
	return {
		status: 'error',
		code: knownCodes.has(error.code) ? error.code : 'SAVE_FAILED',
		message: error.message || '图片保存失败',
	};
}

async function saveEditedImage(event, payload) {
	const sourcePath = normalizeFilePathForFs(payload?.sourcePath);
	const mode = payload?.mode;
	if (!sourcePath || !path.isAbsolute(sourcePath) || !fs.existsSync(sourcePath)) {
		return { status: 'error', code: 'SOURCE_NOT_FOUND', message: '找不到原始图片' };
	}
	if (!findMediaRecord(userConfig, sourcePath, 'photo')) {
		return { status: 'error', code: 'SOURCE_NOT_IN_LIBRARY', message: '只能保存媒体库中的图片' };
	}
	if (mode !== 'copy' && mode !== 'overwrite') {
		return { status: 'error', code: 'INVALID_MODE', message: '保存模式无效' };
	}

	const sourceExtension = path.extname(sourcePath).toLocaleLowerCase();
	const sourceIsGif = sourceExtension === '.gif';
	if (sourceIsGif && mode === 'overwrite') {
		return {
			status: 'error',
			code: 'GIF_OVERWRITE_NOT_SUPPORTED',
			message: 'GIF 动画不能被覆盖，请保存为静态 PNG 副本',
		};
	}
	if (mode === 'overwrite' && !['.jpg', '.jpeg', '.png'].includes(sourceExtension)) {
		return {
			status: 'error',
			code: 'OVERWRITE_FORMAT_NOT_SUPPORTED',
			message: '该图片格式不能安全覆盖，请保存为 PNG 副本',
		};
	}
	const saveKey = getPathKey(sourcePath);
	if (activeImageSaves.has(saveKey)) {
		return { status: 'error', code: 'SAVE_IN_PROGRESS', message: '该图片正在保存' };
	}
	activeImageSaves.add(saveKey);

	try {
		const format = mode === 'overwrite'
			? inferEditedImageFormat(sourcePath)
			: (sourceIsGif ? 'png' : inferEditedImageFormat(sourcePath, payload?.format));
		const extension = format === 'jpeg' ? '.jpg' : '.png';
		let outputPath = sourcePath;

		if (mode === 'copy') {
			const defaultName = getEditedCopyDefaultName(sourcePath, format);
			const saveDialogResult = await dialog.showSaveDialog(mainWindow, {
				title: '保存图片副本',
				defaultPath: path.join(path.dirname(sourcePath), defaultName),
				filters: [{
					name: format === 'jpeg' ? 'JPEG 图片' : 'PNG 图片',
					extensions: format === 'jpeg' ? ['jpg', 'jpeg'] : ['png'],
				}],
			});
			if (saveDialogResult.canceled || !saveDialogResult.filePath) return { status: 'canceled' };
			outputPath = saveDialogResult.filePath;
			const chosenExtension = path.extname(outputPath).toLocaleLowerCase();
			const extensionMatches = format === 'jpeg'
				? ['.jpg', '.jpeg'].includes(chosenExtension)
				: chosenExtension === '.png';
			if (!extensionMatches) outputPath += extension;
			if (getPathKey(outputPath) === getPathKey(sourcePath)) {
				return {
					status: 'error',
					code: 'COPY_TARGET_IS_SOURCE',
					message: '副本不能覆盖原图，请选择其他文件名',
				};
			}
		} else {
			const confirmation = await dialog.showMessageBox(mainWindow, {
				type: 'warning',
				title: '覆盖原图',
				message: `确定覆盖“${path.basename(sourcePath)}”吗？`,
				detail: `${sourcePath}\n\nUtaha Player 会先创建临时备份并验证编辑结果。`,
				buttons: ['取消', '覆盖原图'],
				defaultId: 0,
				cancelId: 0,
				noLink: true,
			});
			if (confirmation.response !== 1) return { status: 'canceled' };
		}

		const encodedBuffer = encodeEditedRaster(payload?.raster, format);
		let image;
		await writeFileAtomically(outputPath, encodedBuffer, {
			validateFile: async (tempPath) => !nativeImage.createFromPath(tempPath).isEmpty(),
			afterReplace: async () => {
				const stats = await fs.promises.stat(outputPath);
				const thumbnailUrl = generateThumb(outputPath, { force: true });
				const configBeforeIndexing = userConfig;
				const nextConfig = upsertMediaRecords(configBeforeIndexing, 'photo', [{
					path: outputPath,
					src: outputPath,
					title: path.basename(outputPath, path.extname(outputPath)),
					size: stats.size,
					modified: stats.mtime.toISOString(),
					thumbnailUrl,
					thumb: thumbnailUrl,
				}], { markImported: true });
				const savedRecord = findMediaRecord(nextConfig, outputPath, 'photo');
				if (!savedRecord) throw new Error('无法更新图片媒体记录');
				image = toMediaSummary(savedRecord);
				try {
					persistUserConfig(nextConfig);
				} catch (persistError) {
					userConfig = configBeforeIndexing;
					try {
						store.set('userConfig', configBeforeIndexing);
					} catch (restoreError) {
						persistError.code = 'ROLLBACK_FAILED';
						persistError.message = `媒体库写入失败且无法恢复配置：${restoreError.message}`;
					}
					throw persistError;
				}
			},
			onCleanupError: (backupPath, cleanupError) => {
				console.warn('无法清理图片保存备份文件:', backupPath, cleanupError);
			},
		});
		try {
			notifyLibraryUpdated('photo');
		} catch (notificationError) {
			console.warn('图片已保存，但图库刷新通知发送失败:', notificationError);
		}
		return {
			status: 'saved',
			mode,
			outputPath,
			image,
			...(sourceIsGif ? { warning: 'GIF_FLATTENED_TO_PNG' } : {}),
		};
	} catch (error) {
		console.error('保存编辑后的图片失败:', error);
		return saveErrorResult(error);
	} finally {
		activeImageSaves.delete(saveKey);
	}
}

const PLAYER_PREFERENCE_VALUES = {
	music: {
		playerEffect: new Set(['ImmersiveLyrics', 'VinylPlayer']),
		playMode: new Set(['shuffle', 'sequential play', 'single loop']),
	},
	video: {
		playMode: new Set(['sequential', 'repeat', 'repeat-one', 'shuffle']),
	},
};

function setPlayerPreference(event, payload) {
	const type = payload?.type;
	const key = payload?.key;
	if (!['music', 'video'].includes(type)) throw new TypeError('播放器类型无效');
	if (key === 'volume') {
		const numericValue = Number(payload?.value);
		if (!Number.isFinite(numericValue)) throw new TypeError('音量值无效');
		updateUserConfig(null, { attrName: `${type}.volume`, value: Math.max(0, Math.min(100, numericValue)) });
		return { status: 'updated' };
	}
	const allowedValues = PLAYER_PREFERENCE_VALUES[type]?.[key];
	if (!allowedValues?.has(payload?.value)) throw new TypeError('播放器偏好值无效');
	updateUserConfig(null, { attrName: `${type}.${key}`, value: payload.value });
	return { status: 'updated' };
}

//  添加事件监听
function listenEvent() {
	// 用户配置相关处理程序
	ipcMain.handle('set-player-preference', setPlayerPreference);
	ipcMain.handle('get-userConfig', getUserConfig); // 获取用户配置
	ipcMain.handle('get-home-summary', getHomeSummaryHandler);
	ipcMain.handle('search-library', searchLibraryHandler);
	ipcMain.handle('import-media-folder', importMediaFolder);
	ipcMain.handle('get-recent-activity', getRecentActivityHandler);
	ipcMain.handle('get-favorites', getFavoritesHandler);
	ipcMain.handle('update-playback-progress', updatePlaybackProgressHandler);
	ipcMain.handle('record-media-activity', recordMediaActivityHandler);
	ipcMain.handle('set-media-favorite', setMediaFavoriteHandler);

	// 添加音频相关处理程序
	ipcMain.handle('get-music-list', getMusicList)  //  获取播放列表
	ipcMain.handle('get-music-file-path', getMusicPath) // 获取音乐文件路径
	ipcMain.handle('select-audio-file', chooseMusicFile); // 选择单个音频文件
	ipcMain.handle('select-music-files', chooseMusicFiles); // 选择多个音频文件
	ipcMain.handle('get-music-info', getMusicInfo); // 获取音频信息 
	ipcMain.handle('remove-from-playlist', (event, songId) => {
		removeFromPlaylist(event, songId);
		return getMusicList();
	});
	ipcMain.handle('add-music-to-library', (event, musicList) => {
		addMusicToLibrary(event, musicList);
		return getMusicList();
	});

	// 添加歌词相关处理程序
	ipcMain.handle('load-lyrics', loadLyricsFile); // 加载歌词文件
	ipcMain.handle('select-lyrics-file', selectLyricsFile); // 选择歌词文件
	ipcMain.handle('save-lyrics-association', saveLyricsAssociation); // 保存歌词关联

	// ========视频处理==============
	ipcMain.handle('check-file-exists', (event, filePath) => {
		try {
			const normalizedPath = normalizeFilePathForFs(filePath);
			return Boolean(findMediaRecord(userConfig, normalizedPath, 'video')) && fs.existsSync(normalizedPath);
		} catch (err) {
			console.error('检查文件存在性失败:', err);
			return false;
		}
	});
	ipcMain.handle('get-video-list', getVideoList)  //  获取播放列表
	ipcMain.handle('get-video-file-path', getVideoPath) // 获取视频文件路径
	ipcMain.handle('select-video-file', chooseVideoFile); // 选择单个视频文件
	ipcMain.handle('select-video-files', chooseVideoFiles); // 选择多个视频文件
	ipcMain.handle('get-video-info', getVideoInfo); // 获取视频信息
	ipcMain.handle('remove-from-videolist', (event, videoId) => {
		removeFromVideolist(event, videoId);
		return getVideoList();
	});
	ipcMain.handle('add-video-to-library', (event, videoList) => {
		addVideoToLibrary(event, videoList);
		return getVideoList();
	});
	// ==========图片处理================
	ipcMain.handle('get-images', handleImageRequest); // 处理图片和目录
	ipcMain.handle('save-edited-image', saveEditedImage);
	// 获取图片列表幻灯片播放配置
	ipcMain.handle('get-imagelist-show-config', getSlideImagesConfig);
	ipcMain.handle('update-slide-show-config', (event, config) => {
		const attrNames = Array.isArray(config?.attrName) ? [...config.attrName] : [];
		const values = Array.isArray(config?.value) ? [...config.value] : [];
		const countIndex = attrNames.indexOf('photo.photoPlayCount');
		if (countIndex !== -1) values[countIndex] = clampPhotoPlayCount(values[countIndex]);
		const listIndex = attrNames.indexOf('photo.photoLibrary.slideImagesCache');
		if (listIndex !== -1) values[listIndex] = sanitizePhotoSelection(values[listIndex]);
		updateUserConfig(null, {
			attrName: attrNames,
			value: values
		})
		if (listIndex !== -1) notifyLibraryUpdated('photo');
		return getSlideImagesConfig();
	})
	// 从本地删除图片文件
	ipcMain.handle('delete-image-file', (event, data) => {
		let { filePath } = data;
		try {
			const normalizedPath = normalizeFilePathForFs(filePath);
			if (!findMediaRecord(userConfig, normalizedPath, 'photo')) {
				return { success: false, message: '只能删除媒体库中的图片' };
			}
			fs.unlinkSync(normalizedPath);
			userConfig = removeMediaRecord(userConfig, 'photo', normalizedPath);
			persistUserConfig();
			notifyLibraryUpdated('photo');
			return { success: true, message: '图片删除成功' };
		} catch (error) {
			console.error('删除图片文件失败:', error);
			return { success: false, message: '图片删除失败' };
		}
	})
	// 处理图片幻灯片播放
	ipcMain.handle('open-slide-show', (event, config) => {
		updateUserConfig(null, {
			attrName: ['photo.photoPlayCount', 'photo.photoLibrary.slideImagesCache'],
			value: [clampPhotoPlayCount(config?.photoPlayCount), sanitizePhotoSelection(config?.imageList)],
		});
		openSlideShowWindow()
		return { status: 'opened' };
	})
	//	关闭图片幻灯片窗口
	ipcMain.handle('close-slide-show', () => {
		if (slideWindow) {
			slideWindow.close()
			slideWindow = null
		}
		return { status: 'closed' };
	})
}

// 获取视频播放列表
function getVideoList() {
	return userConfig.video?.videoLibrary?.videoList || [];
}
// 查找视频文件完整路径
async function getVideoPath(event, filename) {
	for (const folder of userConfig.video.videoLibrary.videoFolders) {
		const filePath = path.join(folder, filename);
		if (fs.existsSync(filePath)) {
			return filePath;
		}
	}
	return null;
}
// 选择视频文件
async function chooseVideoFile() {
	const result = await dialog.showOpenDialog(mainWindow, {
		properties: ['openFile'],//选择文件
		filters: [
			{ name: '视频', extensions: ['mp4', 'webm', 'ogg'] }
		]
	})
	if (!result.canceled && result.filePaths.length > 0) {
		const originalPath = result.filePaths[0];
		//判断是否需要转码
		if (needsTranscoding(originalPath)) {
			try {
				const convertedPath = await transcodeVideo(originalPath);
				return convertedPath;
			} catch (err) {
				console.err("转码失败：", err);
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
            { name: '视频文件', extensions: videoFileTypeList }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
		return processVideoFilePaths(result.filePaths);
    }
    return [];
}

async function processVideoFilePaths(filePaths) {
	const processedPaths = [];
	const totalFiles = filePaths.length;

	for (let i = 0; i < filePaths.length; i++) {
		const filePath = filePaths[i];
		try {
			if (needsTranscoding(filePath)) {
				const outputPath = getOutputPath(filePath);
				const convertedPath = await transcodeVideo(filePath, outputPath, {
					current: i + 1,
					total: totalFiles,
				});
				if (!fs.existsSync(convertedPath)) {
					console.error(`转码后文件不存在: ${convertedPath}`);
					continue;
				}
				processedPaths.push(convertedPath);
			} else if (fs.existsSync(filePath)) {
				processedPaths.push(filePath);
			}
		} catch (error) {
			console.error(`处理文件 ${filePath} 失败:`, error);
		}
	}

	return processedPaths;
}
async function transcodeVideo(inputPath, outputPath = getOutputPath(inputPath), batch = { current: 1, total: 1 }) {
    try {
        console.log(`开始转码: ${inputPath} -> ${outputPath}`);

        // 通知渲染进程转码开始
        if (mainWindow) {
            mainWindow.webContents.send('video-transcode-start', {
                file: inputPath,
                current: batch.current,
                total: batch.total
            });
        }

        return await new Promise((resolve, reject) => {
            // 添加视频文件验证
            if (!fs.existsSync(inputPath)) {
                reject(new Error('输入文件不存在'));
                return;
            }

            ffmpeg(inputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-profile:v baseline',
                    '-level 3.0',
                    '-pix_fmt yuv420p',
                    '-preset medium',
                    '-crf 23',
                    '-movflags +faststart',
                    '-r 25',
                    '-vsync cfr',
                    '-avoid_negative_ts make_zero'
                ])
                .format('mp4')
                .output(outputPath)
                .on('start', commandLine => {
                    console.log('FFmpeg 命令:', commandLine);
                })
                .on('progress', (progress) => {
                    if (mainWindow && progress.percent) {
                        mainWindow.webContents.send('video-transcode-progress', {
                            file: inputPath,
                            percent: Math.round(progress.percent)
                        });
                    }
                })
                .on('end', () => {
                    console.log('视频转码完成:', outputPath);
                    
                    // 通知渲染进程转码成功
                    if (mainWindow) {
                        mainWindow.webContents.send('video-transcode-success', {
                            original: inputPath,
                            converted: outputPath,
                            current: batch.current,
                            total: batch.total
                        });
                    }
                    
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('视频转码失败:', err.message);
                    reject(err);
                })
                .run();
        });
    } catch (err) {
        console.error('转码异常:', err);
        
        // 通知渲染进程转码失败
        if (mainWindow) {
            mainWindow.webContents.send('video-transcode-error', {
                file: inputPath || '未知文件',
                error: err.message,
                current: batch.current,
                total: batch.total,
            });
        }
        
        throw err;
    }
}

// 获取视频信息 ???
async function getVideoInfo(event, filePaths) {
	try {
		const videoArr = [];

		for (const filePath of filePaths) {
			// 获取文件基本信息
			const stats = fs.statSync(filePath);
			const fileName = path.basename(filePath);
			
			// 获取视频元数据：优先使用 fluent-ffmpeg 的 ffprobe，失败则直接调用二进制
			let metadata = null;
			try {
				metadata = await new Promise((resolve, reject) => {
					ffmpeg.ffprobe(filePath, (err, data) => {
						if (err) {
							console.error('fluent-ffmpeg.ffprobe 返回错误:', err.message);
							reject(err);
						} else {
							resolve(data);
						}
					})
				});
			} catch (ffprobeErr) {
				console.warn('fluent-ffmpeg ffprobe 调用失败，尝试直接调用 ffprobe 二进制:', ffprobeErr.message);
				// 回退：直接调用 ffprobe 可执行文件
				try {
					const { execFileSync } = require('child_process');
					const ffprobeBin = ffprobePathResolved || ffprobeExport;

					if (!ffprobeBin || !fs.existsSync(ffprobeBin)) {
						throw new Error(`ffprobe 二进制不存在: ${ffprobeBin}`);
					}
					const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];
					const output = execFileSync(ffprobeBin, args, { 
						encoding: 'utf8', 
						maxBuffer: 10 * 1024 * 1024,
						timeout: 30000 
					});
					metadata = JSON.parse(output);
				} catch (binErr) {
					console.error('直接调用 ffprobe 二进制也失败:', binErr.message);
					console.error('完整错误:', binErr);
					throw new Error(`无法获取视频信息: ${ffprobeErr.message}`);
				}
			}
			
			const videoStream = metadata.streams.find(s => s.codec_type === 'video');

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

			const videoInfoObj = {
				id: filePath,
				path: filePath,
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
	} catch (error) {
		console.error('=== 获取视频信息失败 ===');
		console.error('错误消息:', error.message);
		console.error('错误堆栈:', error.stack);
		return [];
	}
}

// 添加视频到播放列表
function addVideoToLibrary(event, videoList) {
	try {
		userConfig = upsertMediaRecords(userConfig, 'video', videoList, { markImported: true });
		persistUserConfig();
		notifyLibraryUpdated('video');
	} catch (err) {
		console.error('添加视频到播放列表失败:', err);
	}
	return null;
}
// 音视频在一个播放列表还是分开？
// 从播放列表中移除视频
function removeFromVideolist(event, videoId) {
	const existing = findMediaRecord(userConfig, videoId, 'video');
	if (existing) {
		userConfig = removeMediaRecord(userConfig, 'video', videoId);
		persistUserConfig();
		notifyLibraryUpdated('video');
	}
}
/**
 * @description 获取缓存的图片和播放次数配置
 * 
 */
function getSlideImagesConfig() {
	let changed = false;
	for (const record of userConfig.mediaLibrary?.records || []) {
		if (record.type === 'photo') changed = updateMediaThumbnail(record) || changed;
	}
	if (changed) persistUserConfig();
	return {
		photoPlayCount: userConfig.photo?.photoPlayCount || 4,
		slideImagesCache: userConfig.photo?.photoLibrary?.slideImagesCache || []
	}
}

function clampPhotoPlayCount(value) {
	const count = Number(value);
	return Number.isFinite(count) ? Math.max(1, Math.min(12, Math.round(count))) : 4;
}

function sanitizePhotoSelection(items) {
	const safeItems = [];
	const seen = new Set();
	for (const item of Array.isArray(items) ? items : []) {
		const identifier = item?.id || item?.path || item?.src;
		const record = findMediaRecord(userConfig, identifier, 'photo');
		if (!record || seen.has(record.id)) continue;
		seen.add(record.id);
		safeItems.push({
			...record,
			rows: Number(item?.rows) === 2 ? 2 : 1,
			cols: Number(item?.cols) === 2 ? 2 : 1,
		});
	}
	return safeItems;
}
/**
 * @description 打开图片幻灯片窗口
 * @description 如果窗口已存在则聚焦，否则创建新窗口并加载幻灯片页面，同时传递当前幻灯片配置
 */
function openSlideShowWindow() {
	if (slideWindow) {
		slideWindow.focus()
		return
	}
	let configParam = { 
		attrName: ['photo.photoPlayCount', 'photo.photoLibrary.slideImagesCache'], 
		value: [userConfig.photo?.photoPlayCount || 4, userConfig.photo?.photoLibrary?.slideImagesCache || []] 
	}
	updateUserConfig(null, configParam)

	slideWindow = new BrowserWindow({
		fullscreen: true,
		backgroundColor: '#000000',
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, 'config/preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: false
		},
		title: '幻灯片播放',
	})

	if (app.isPackaged) {
		// 生产环境：加载打包后的 build/index.html
		slideWindow.loadFile(
			path.join(__dirname, '../build/index.html'),
			{ hash: '/slideshow' }
		)
	} else {
		slideWindow.loadURL('http://localhost:3000/#/slideshow')
	}

	slideWindow.on('closed', () => {
		slideWindow = null
	})
}


function createWindow() {   //  创建窗口
	const windowOptions = createMainWindowOptions({
		platform: process.platform,
		isPackaged: app.isPackaged,
		preloadPath: path.join(__dirname, 'config/preload.js'),
	});
	mainWindow = new BrowserWindow(windowOptions);
	if (process.platform === 'win32' && typeof mainWindow.setBackgroundMaterial === 'function') {
		try {
			mainWindow.setBackgroundMaterial('mica');
		} catch (error) {
			console.warn('Mica 背景不可用，已回退到纯色背景:', error.message);
		}
	}
	
	// 判断是开发环境还是生产环境
	if (app.isPackaged) {
		// 生产环境：加载打包后的 build/index.html
		mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
	} else {
		// 开发环境：加载 React 开发服务器
		mainWindow.loadURL("http://localhost:3000/");
	}
	
	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
	});

	// 开发环境打开开发工具
	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}
}

// 应用启动时创建窗口
app.on('ready', async () => {
	if (isInstallerStartup) return;
	await initStore(); // 初始化配置存储
	createWindow();
});

// 应用准备就绪后设置协议和监听器
app.whenReady().then(() => {
	if (isInstallerStartup) return;
    // 注册 file 协议
    protocol.registerFileProtocol('file', (request, callback) => {
		try {
			callback(fileURLToPath(request.url));
		} catch (error) {
			console.warn('无法解析本地媒体 URL:', request.url, error.message);
			callback({ error: -6 });
		}
    });
    listenEvent();
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
