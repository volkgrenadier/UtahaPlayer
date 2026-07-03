# HandOff Detail

更新时间：2026-07-03 20:39:43 +08:00

## 1. Project Overview

项目名：`utaha-music`

产品名：`Utaha Music`

当前版本：`0.1.0`

项目类型：Electron + React 桌面多媒体播放器。

主要目标：管理和播放本地音乐、视频、图片，并提供图片浏览、基础编辑和全屏幻灯片播放。

主要技术栈：

- Electron 34
- React 19
- Create React App / react-scripts 5
- React Router 6，使用 `HashRouter`
- Material UI 6
- electron-store 10
- music-metadata
- fluent-ffmpeg、ffmpeg-static、ffprobe-static
- react-konva / konva
- Sass

## 2. Commands

`package.json` 中的主要脚本：

```powershell
npm start
```

启动 React dev server。

```powershell
npm run electron-trace
```

启动 Electron 并开启 trace warnings。README 推荐先启动 `npm start`，再运行该命令。

```powershell
npm run dev
```

使用 concurrently 同时启动 React dev server，并等待 `http://localhost:3000` 后启动 Electron。

```powershell
npm run build
```

构建 React 静态资源。

```powershell
npm run package
npm run make
```

使用 Electron Forge 打包或生成安装包。

## 3. Top-Level Files

- `package.json`：依赖、脚本、Electron main 指向 `./src/main.js`。
- `forge.config.js`：Electron Forge 配置，开启 asar、prune，并将 `ffmpeg-static`、`ffprobe-static` 解包到 asar 外。
- `README.md`：中文项目说明和功能规划，部分内容是愿景，不完全等同于当前实现。
- `README.en.md`：Gitee 模板式英文说明，实际信息较少。
- `router.md`：路由文档，当前已过时。
- `现存bug.md`：记录视频格式问题。
- `api.txt`：当前内容很少。
- `ffmpeg`：根目录零字节文件，未发现代码引用，可能是误留文件。
- `UI图/`、`README.assets/`、`src/assets/`：图片资源。

## 4. Startup Flow

Electron 主进程入口：

1. `src/main.js` 导入 Electron、文件系统、music-metadata、配置、ffmpeg/ffprobe 和缩略图 helper。
2. `resolveBinary(pkgName, exportedPath)` 优先使用静态包导出路径，失败时尝试 `process.resourcesPath/app.asar.unpacked/node_modules/...`。
3. `initStore()` 动态导入 `electron-store`，读取或创建 `userConfig`。
4. `app.on('ready')` 等待 `initStore()` 完成后创建主窗口。
5. `app.whenReady()` 注册 `file` 协议，并调用 `listenEvent()` 注册 IPC。
6. `createWindow()` 创建 1200x700 无边框主窗口，开发模式加载 `http://localhost:3000/`，生产模式加载 `../build/index.html`。
7. `openSlideShowWindow()` 创建独立全屏窗口，开发模式加载 `http://localhost:3000/#/slideshow`，生产模式加载 build 文件并设置 hash。

React 渲染入口：

1. `src/index.js` 使用 `ReactDOM.createRoot`。
2. 外层包裹 Redux `Provider` 和 `HashRouter`。
3. `src/App.js` 外层包裹 `NotificationProvider`。
4. 普通路由渲染 Header、LeftNav、右侧内容区。
5. `/slideshow` 路由只渲染极简幻灯片容器，不显示主框架。

## 5. User Config Model

主进程默认 `userConfig`：

```js
{
  music: {
    musicLibrary: {
      musicList: [],
      musicFolders: []
    },
    volume: 25,
    playerEffect: 'ImmersiveLyrics'
  },
  video: {
    videoLibrary: {
      videoList: [],
      videoFolders: []
    },
    volume: 25
  },
  photo: {
    photoLibrary: {
      slideImagesCache: []
    },
    photoPlayCount: 4
  }
}
```

配置读写：

- `updateUserConfig(_, dataObj)` 支持点路径，如 `music.volume`。
- 也支持数组路径，如 `['photo.photoPlayCount', 'photo.photoLibrary.slideImagesCache']`。
- 写入后立即 `store.set('userConfig', userConfig)`。
- `getUserConfig(e, attrName)` 设计上应支持返回整个配置，但当前在空参保护前调用了 `attrName.split('.')`。

## 6. IPC Surface

`src/config/preload.js` 暴露 `window.electronFeatures`：

### Window

- `sendMessage('close-window')`
- `sendMessage('minimize-window')`
- `sendMessage('maximize-window')`
- `sendMessage('window-move-open', canMove)`

对应主进程：

- `closeApp`
- `minimizeWindow`
- `maximizeWindow`
- `moveWin`

### Config

- `getUserConfig(attrName)` -> `ipcRenderer.invoke('get-userConfig', attrName)`
- `updateUserConfig(attrName, value)` -> `ipcRenderer.send('update-userConfig', { attrName, value })`

### Music

- `selectAudioFiles()` -> `select-music-files`
- `getAudioInfo(filePath)` -> `get-music-info`
- `getMusicList()` -> `get-music-list`
- `loadLyrics(filePath)` -> `load-lyrics`
- `selectLyricsFile()` -> `select-lyrics-file`
- `saveLyricsAssociation(musicId, lyricPath)` -> `save-lyrics-association`
- `sendMessage('add-music-to-library', info)`
- `sendMessage('remove-from-playlist', songId)`

### Video

- `selectVideoFiles()` -> `select-video-files`
- `getVideoInfo(filePath)` -> `get-video-info`
- `getVideoList()` -> `get-video-list`
- `needsTranscoding(filePath)` -> `video-needs-transcoding`
- `getOutputPath(filePath)` -> `get-output-path`
- `transcodeVideo(inputPath, outputPath)` -> `transcode-video`
- `diagnoseFfprobe()` -> `diagnose-ffprobe`
- `checkFileExists(filePath)` -> `check-file-exists`

注意：`check-file-exists` 目前没有在 `src/main.js` 注册 handler。

### Photo

- `getImages(openDirectoryOrFile)` -> `get-images`
- `getImageListShowConfig()` -> `get-imagelist-show-config`
- `updateSlideShowConfig(imageList, photoPlayCount)` -> `update-slide-show-config`
- `closeSlideShow()` -> `close-slide-show`
- `deleteImageFile(filePath, updatedImageList)` -> `delete-image-file`
- `sendMessage('open-slide-show', { imageList, photoPlayCount })`

### Unmatched Or Unused IPC

- `update-userconfig-music`：MusicPlayer 发送，但主进程未注册。
- `update-userconfig-video`：VideoPlayer 发送，但主进程未注册。
- `getSlideImages`：preload 的 `channelsWithResponse` 中存在，但未见主进程注册和渲染层调用。
- `saveImage`：PhotoEditor 检查 `window.electronFeatures?.saveImage`，但 preload 未暴露，主进程未实现。

## 7. Routing

实际路由在 `src/component/Routes/Routes.js`：

- `/` -> `Home`
- `/music` -> `Music`
- `/video` -> `Video`
- `/photo` -> `Photo`
- `/collect` -> `Collect`
- `/resently` -> `Resently`
- `/slideshow` -> `PhotoSlideShow`

`LeftNav` 实际导航：

- `/music`
- `/video`
- `/photo`
- `/collect`
- `/resently`

文档差异：

- `router.md` 写的是 `/picture`，实际为 `/photo`。
- `router.md` 写了 `/musicplayer`，实际没有该路由。
- `router.md` 没有记录 `/video` 和 `/slideshow`。

## 8. UI Shell

`Header`：

- 显示标题 `Utaha Player`。
- 最小化、最大化、关闭按钮通过 `sendMessage` 调主进程。
- 当前最大化按钮 icon 没有跟随窗口状态切换，`FullscreenExitOutlinedIcon` 被导入但未使用。

`DragWindow`：

- 包裹 Header。
- `mousedown` 时发送 `window-move-open true`，`mouseup` 时发送 false。
- 主进程 `moveWin` 通过 `screen.getCursorScreenPoint()` 和 `mainWindow.setBounds()` 实现无边框窗口拖动。

`LeftNav`：

- 使用 MUI icons 和 `NavLink`。
- 支持折叠/展开显示文字。

`NotificationProvider`：

- 暴露 `notify.info/success/warning/error`。
- 也暴露旧式 `notify.regularNotify.info` 和 `notify.popoverNotify.info`。
- `currentNoficationType` 拼写有误，但调用方已经依赖该字段，修复时要同步改调用点。

## 9. Music Chain

入口页面：

- `src/component/Music/Music.js` 只包一层容器并渲染 `MusicPlayer`。

导入和元数据：

1. 用户点击播放列表按钮中的“添加音乐文件”。
2. `MusicPlayer.handleSelectAudioFiles()` 调 `electronFeatures.selectAudioFiles()`。
3. 主进程 `chooseMusicFiles()` 使用 Electron dialog 选择多个音频文件。
4. 渲染层拿路径后调用 `getAudioInfo(filePaths)`。
5. 主进程 `getMusicInfo()` 用 `music-metadata.parseFile` 提取标题、艺术家、专辑封面和文件信息。
6. 渲染层发送 `add-music-to-library`。
7. 主进程 `addMusicToLibrary()` 合并到 `userConfig.music.musicLibrary.musicList`，写入 electron-store，并广播 `music-list-updated`。

播放：

- `MusicPlayer` 使用 `useRef(new Audio())` 保存 HTMLAudioElement。
- `currentMusic` 变化时设置 `audio.src = currentMusic.path`，调用 `audio.load()` 和 `audio.play()`。
- 支持顺序播放、随机播放、单曲循环。
- 音量使用 `MAXVOLUME = 60` 做最大音量限制，保存到 `music.volume`。
- 播放器视觉效果保存在 `music.playerEffect`，当前有 `ImmersiveLyrics` 和 `VinylPlayer`。

歌词：

- `config/config.js` 支持 `lrc/LRC/txt/krc/KRC`。
- KRC 使用 `src/utils/krc_parser.js` 解密、zlib 解压，并转成类似 LRC 的数组。
- `loadLyricsFile()` 优先查找同目录同名歌词文件。
- 手动选择歌词文件时 `selectLyricsFile()` 会根据扩展名解析。
- `MusicPlayer` 会将歌词数组传入 `ImmersiveLyricsView`，按当前播放时间滚动和高亮。

音乐链路问题：

- `saveLyricsAssociation()` 保存字段为 `lyricPath`，但 `loadLyricsFile()` 检查 `musicEntry.lyricsPath`，导致关联歌词下次可能无法复用。
- 自动查找同名 KRC 时 `handlerRes = lyricFileType[index].handler(...)` 少了 `await`，而 `parseKrcForReact` 是 async。
- `togglePlayMode()` 发送 `update-userconfig-music`，主进程没有对应 handler。
- 播放列表里的歌词关联按钮总是关联当前音乐，不是被点击的 song。

## 10. Video Chain

入口页面：

- `src/component/Video/Video.js` 渲染 `VideoPlayer`。

导入：

1. 用户点击“添加视频文件”。
2. `VideoPlayer.handleSelectVideoFiles()` 调 `electronFeatures.selectVideoFiles()`。
3. 主进程 `chooseVideoFiles()` 打开文件选择器，支持 `mp4/webm/ogg/mkv/avi`。
4. 对每个文件调用 `needsTranscoding(filePath)`。
5. 不支持扩展名时输出到 `../convertedVideos/<base>.mp4` 并调用 `transcodeVideo()`。
6. 转码期间主进程发送 `video-transcode-start/progress/success/error`。
7. 渲染层收到通知后展示 Snackbar。
8. 渲染层拿处理后的路径调 `getVideoInfo(filePaths)`。
9. 主进程用 `ffmpeg.ffprobe` 提取元数据，失败时直接 `execFileSync(ffprobeBin, args)` 回退。
10. 渲染层发送 `add-video-to-library`。
11. 主进程写入 `userConfig.video.videoLibrary.videoList` 并广播 `video-list-updated`。

播放：

- `VideoPlayer` 使用 HTML5 `<video>`。
- `playSelectedVideo(video)` 会重置时间、进度、拖拽状态，设置 `currentVideo`，然后设置 `videoRef.current.src = file:///...`。
- 支持顺序、列表循环、单个循环、随机播放。
- 音量保存到 `video.volume`，同样受 `MAXVOLUME = 60` 限制。
- 播放失败时会尝试调用 `checkFileExists` 区分文件不存在和格式不支持。

视频链路问题：

- `check-file-exists` 未在主进程注册，当前播放失败路径会遇到 IPC handler 缺失。
- `chooseVideoFile()` 单文件路径调用 `transcodeVideo(originalPath)`，但 `transcodeVideo` 的签名需要 `(event, { inputPath, outputPath })`。
- `chooseVideoFile()` 中有 `console.err`，应为 `console.error`。
- `togglePlayMode()` 发送 `update-userconfig-video`，主进程没有对应 handler。
- `VideoPlayer` 的删除确认文案写“移除歌曲”，应改为“移除视频”。
- `现存bug.md` 记录了视频格式报错，优先从 ffprobe handler、check-file-exists 和转码输出实际可播放性排查。
- 依赖中有 `video.js`，但当前实现没有使用 video.js。

## 11. Photo Chain

入口页面：

- `src/component/Photo/Photo.js` 负责左侧图片列表、工具按钮、右键菜单和右侧编辑区。

导入图片：

1. 用户点击“打开图片”或“打开文件夹”。
2. 渲染层调用 `electronFeatures.getImages()` 或 `getImages('directory')`。
3. 主进程 `handleImageRequest()` 使用 dialog 选择文件/目录。
4. 目录模式下读取目录一级文件，并用 `imageTypeList` 过滤。
5. `thumbnailHelper.attachThumbs()` 为每张图片生成缩略图。
6. 主进程把本次 `imageListWithThumbs` 写入 `photo.photoLibrary.slideImagesCache`。
7. 渲染层将返回结果合并到当前 `imageList`，并按四张一组生成 `rows/cols`。

图片列表：

- Material UI `ImageList` 使用 `quilted` 布局。
- 右键菜单支持“从列表中移除”和“删除本地图片”。
- 删除本地图片通过主进程 `fs.unlinkSync(filePath)` 执行，并更新缓存。
- 播放数量 `photoPlayCount` 范围 1-12。

图片编辑：

- `PhotoEditor` 基于 `react-konva`。
- 支持缩放、平移、旋转、水平/垂直翻转、裁剪框、涂鸦、文字、亮度和对比度。
- 撤销只覆盖 `lines` 和 `texts`，不覆盖旋转、翻转、滤镜和裁剪。
- 导出时优先调用 `window.electronFeatures.saveImage(dataUrl)`，没有该 API 时降级为浏览器下载 `edited-image.png`。

幻灯片：

- `PhotoSlideShow` 独立路由 `/slideshow`。
- 主进程打开独立全屏窗口。
- 幻灯片页从 `getImageListShowConfig()` 读取 `slideImagesCache` 和 `photoPlayCount`。
- 根据数量生成 1x1、2x1、3x1、2x2、3x2、3x3、4x3 网格。
- 定时替换 1-2 个格子，动画是翻转或淡入。
- Esc 调 `closeSlideShow()` 关闭窗口。

图片链路问题：

- `photoConfig.js` 只支持 `jpg/jpeg/png/gif`，README 写了 BMP/WebP。
- 每次主进程选择图片都会用本次选择结果覆盖缓存；React 合并后的完整列表没有同步回 store。
- `Photo.js` 删除失败分支调用 `notifyContext.notify.regularNotify.error`，但 `regularNotify.error` 不存在。
- `PhotoEditor.saveImage` 没有主进程和 preload 实现。
- `PhotoSlideShow.js` 导入了 `use`、`Snackbar`、`Alert`，当前未使用。

## 12. Packaging Notes

`forge.config.js`：

- `asar: true`
- `prune: true`
- `asarUnpack` 包含 `ffmpeg-static` 和 `ffprobe-static`。
- makers 包含 squirrel、zip、deb、rpm。
- 使用 FusesPlugin 禁用 RunAsNode、Node options、CLI inspect，并开启 cookie encryption、asar integrity、only load from asar。

风险：

- `createWindow()` 和 `createTray()` 使用 `src/component/icon/utaha_min.png`，当前文件树没有 `src/component/icon/`。
- `createTray()` 未启用，但如果后续启用会遇到同样的 icon 路径风险。
- ffmpeg/ffprobe 路径解析做了 packaged 回退，但应在打包产物上实际验证 `diagnoseFfprobe()`。

## 13. File-Level Notes

- `src/main.js`：主进程核心，功能集中度很高。后续可以按配置、音乐、视频、图片、窗口拆模块。
- `src/config/preload.js`：渲染层唯一 IPC facade。后续改 IPC 名称时应先改这里，再改调用方。
- `src/config/config.js`：音乐和歌词扩展名配置。
- `src/config/videoConfig.js`：按扩展名判断是否转码，并生成转码输出路径。
- `src/config/photoConfig.js`：图片扩展名配置。
- `src/config/reactConfig.js`：通知时长和最大音量。
- `src/component/MusicPlayer/MusicPlayer.js`：音乐播放、队列、歌词、音量、播放器视觉效果。
- `src/component/MusicPlayer/ImmersiveLyricsView.js`：歌词高亮和滚动展示。
- `src/component/MusicPlayer/VinylPlayer.js`：SVG 唱片机动画。
- `src/component/VideoPlayer/VideoPlayer.js`：视频播放、队列、转码通知、播放错误提示。
- `src/component/Photo/Photo.js`：图片导入、列表布局、右键删除和幻灯片入口。
- `src/component/Photo/PhotoEditor/PhotoEditor.js`：Konva 图片编辑器。
- `src/component/Photo/PhotoSlideShow/PhotoSlideShow.js`：全屏幻灯片。
- `src/utils/NotificationProvider.js`：全局通知上下文。
- `src/utils/krc_parser.js`：KRC 解密、解压和转换。
- `src/thumbnailHelper.js`：主进程缩略图生成和缓存。
- `src/component/MediaImporter/MediaImporter.js`：内容是 SCSS，不是 JS，且当前未被引用。
- `src/component/store/store.js`：Redux store 空 reducer，当前基本只是占位。

## 14. Recommended Fix Order

1. 补 `check-file-exists`：

```js
ipcMain.handle('check-file-exists', (event, filePath) => {
  return !!filePath && fs.existsSync(filePath);
});
```

2. 修 `getUserConfig` 空参：

```js
function getUserConfig(e, attrName) {
  if (!attrName) return userConfig;
  const attrArr = attrName.split('.');
  // keep existing traversal
}
```

3. 修单文件视频转码：

```js
const convertedPath = await transcodeVideo(null, {
  inputPath: originalPath,
  outputPath: getOutputPath(originalPath),
});
```

4. 统一歌词字段：

- 保留 `lyricPath`。
- `loadLyricsFile()` 中检查 `musicEntry.lyricPath`。
- 自动 KRC handler 调用加 `await`。

5. 播放模式配置：

- 简单方案：前端直接调用 `updateUserConfig('music.playMode', newMode)` 和 `updateUserConfig('video.playMode', newMode)`。
- 或者在主进程注册 `update-userconfig-music` / `update-userconfig-video`。

6. 图片通知错误：

- 将 `notifyContext.notify.regularNotify.error(...)` 改成 `notifyContext.notify.error(...)`。
- 或在 Provider 中补 `regularNotify.error`。

7. 图片缓存一致性：

- 打开图片/文件夹后，React 合并并布局完成后调用 `updateSlideShowConfig(updatedImageList, undefined)`。

8. 图片保存：

- 若要保存到本地文件，实现 `saveImage` 的 preload 和 main handler。
- 若只需要下载，移除未实现的 Electron API 分支并明确 UI 文案。

9. 清理杂项：

- 修正 `MediaImporter.js` 文件内容或改扩展名。
- 更新 `router.md`。
- 确认 icon 路径。
- 删除或解释根目录零字节 `ffmpeg` 文件。

## 15. Validation Status

本次只新增文档，没有运行应用、测试或构建。

建议后续修复代码后执行：

```powershell
npm test -- --watchAll=false
npm run build
npm run dev
```

需要单独验证的手工场景：

- 导入 MP3、FLAC，检查播放、音量持久化、歌词自动关联和手动关联。
- 导入 LRC 和 KRC，检查歌词解析和滚动高亮。
- 导入 MP4、MKV、AVI，检查是否转码、是否生成 `convertedVideos`、是否可播放。
- 删除视频/音乐列表项后检查 electron-store 是否同步。
- 打开单张图片和文件夹，重启后检查图片列表缓存是否完整。
- 删除本地图片，检查成功和失败通知。
- 使用图片编辑器导出，确认下载或保存路径符合预期。
- 打开幻灯片，按 Esc 关闭。
- 打包后运行 `diagnoseFfprobe()`，确认 ffmpeg/ffprobe 不在 `app.asar` 内且可执行。
