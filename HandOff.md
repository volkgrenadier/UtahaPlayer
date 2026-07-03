# HandOff

更新时间：2026-07-03 20:39:43 +08:00

## Current Goal

在阅读当前 Electron + React 项目代码后，生成交接文档和详细交接文档，帮助后续开发者快速接手 Utaha Player。

## Current Status

项目是一个基于 Electron、React、Material UI、electron-store、FFmpeg/ffprobe 和 react-konva 的桌面多媒体播放器。当前主功能分为音乐播放、视频播放、图片浏览/编辑/幻灯片三条链路；首页、收藏、最近播放仍是占位页面。

本次工作只新增文档，没有修改业务代码。

## Files Read

- `package.json`
- `forge.config.js`
- `README.md`
- `README.en.md`
- `router.md`
- `现存bug.md`
- `src/main.js`
- `src/config/preload.js`
- `src/config/config.js`
- `src/config/videoConfig.js`
- `src/config/photoConfig.js`
- `src/config/reactConfig.js`
- `src/index.js`
- `src/App.js`
- `src/component/Routes/Routes.js`
- `src/component/Header/Header.js`
- `src/component/LeftNav/LeftNav.js`
- `src/component/DragWindow/DragWindow.js`
- `src/component/Music/Music.js`
- `src/component/MusicPlayer/MusicPlayer.js`
- `src/component/MusicPlayer/ImmersiveLyricsView.js`
- `src/component/MusicPlayer/ScrollTitle.js`
- `src/component/MusicPlayer/VinylPlayer.js`
- `src/component/Video/Video.js`
- `src/component/VideoPlayer/VideoPlayer.js`
- `src/component/Photo/Photo.js`
- `src/component/Photo/PhotoEditor/PhotoEditor.js`
- `src/component/Photo/PhotoSlideShow/PhotoSlideShow.js`
- `src/utils/NotificationProvider.js`
- `src/utils/krc_parser.js`
- `src/utils/toolsFunction.js`
- `src/thumbnailHelper.js`
- `src/component/MediaImporter/MediaImporter.js`
- `src/style/public.scss`
- `src/app.scss`

## Files Modified

- 新增 `HandOff.md`
- 新增 `HandOff_detail.md`

## Key Decisions

- 交接内容以当前代码为准，不以 README 中尚未实现的功能需求为准。
- 没有启动应用、运行构建或修复代码；本文档记录的是代码阅读结果和可继续推进的修复顺序。
- 没有涉及论文或外部资料检索，`Literature Checked` 不适用。

## Architecture Summary

- Electron 主进程入口是 `src/main.js`，负责创建主窗口/幻灯片窗口、初始化 electron-store、注册 IPC、处理文件选择、音视频元数据、视频转码、图片缩略图和本地文件删除。
- 预加载脚本是 `src/config/preload.js`，通过 `window.electronFeatures` 暴露渲染层可调用的 IPC API。
- React 入口是 `src/index.js`，使用 `HashRouter`、Redux Provider 和 `App`。Redux store 目前没有实际 reducer。
- `src/App.js` 根据路由区分普通主界面和 `/slideshow` 极简幻灯片布局。
- 路由实现位于 `src/component/Routes/Routes.js`，实际包含 `/`、`/music`、`/video`、`/photo`、`/collect`、`/resently`、`/slideshow`。
- 音乐功能集中在 `MusicPlayer`，使用 HTMLAudioElement、music-metadata、electron-store 播放列表和歌词关联。
- 视频功能集中在 `VideoPlayer`，使用 HTML5 video、ffmpeg/ffprobe、转码事件通知和 electron-store 视频库。
- 图片功能集中在 `Photo`、`PhotoEditor`、`PhotoSlideShow`，使用 nativeImage 生成缩略图、Material UI 图片墙、react-konva 编辑和独立全屏幻灯片窗口。

## How to Run

开发方式一：

```powershell
npm start
npm run electron-trace
```

开发方式二：

```powershell
npm run dev
```

构建 React：

```powershell
npm run build
```

Electron Forge 打包：

```powershell
npm run package
npm run make
```

## Known Issues

1. `现存bug.md` 记录的视频格式问题仍需要优先处理：导入视频后可能报 `format-1` 或“视频格式不支持”。
2. `src/main.js` 的 `getUserConfig` 在检查 `attrName` 前先调用 `attrName.split('.')`，如果渲染层无参调用会报错。
3. 歌词关联字段不一致：保存时写 `lyricPath`，加载关联歌词时检查 `lyricsPath`。
4. 自动查找同名 KRC 歌词时调用异步 handler 缺少 `await`，手动选择 KRC 时才正确等待。
5. `check-file-exists` 在 preload 和 VideoPlayer 中被调用，但主进程没有注册对应 `ipcMain.handle`。
6. 音乐和视频播放模式切换会发送 `update-userconfig-music` / `update-userconfig-video`，主进程没有注册这些 IPC。
7. 单文件视频选择 `chooseVideoFile` 调用 `transcodeVideo(originalPath)`，但 `transcodeVideo` 实际签名是 `(event, { inputPath, outputPath })`。
8. `Photo.js` 删除本地图片失败分支调用 `notifyContext.notify.regularNotify.error`，但 `regularNotify` 只定义了 `info`。
9. 图片新增时 React 侧会合并列表，但主进程缓存的是本次选择结果，完整合并列表没有立即同步到 electron-store。
10. `PhotoEditor` 的 Electron 保存接口 `saveImage` 未在 preload/main 中实现，目前只能走浏览器下载降级。
11. `src/component/MediaImporter/MediaImporter.js` 内容实际是 SCSS 片段，文件类型和内容不匹配。
12. `router.md` 已过时：文档写 `/picture` 和 `/musicplayer`，实际路由是 `/photo` 且没有 `/musicplayer`。
13. `forge.config.js` 已配置 asarUnpack，但窗口 icon 指向 `src/component/icon/utaha_min.png`，当前文件树没有该路径。
14. README 声称图片支持 BMP/WebP，但 `photoConfig.js` 只允许 `jpg/jpeg/png/gif`。

## Next Steps

1. 先补齐视频链路缺口：注册 `check-file-exists`，修正 `chooseVideoFile` 调用签名，复查转码输出和 HTML5 video 可播放性。
2. 修复配置读取和 IPC 命名：`getUserConfig` 空参保护，播放模式直接使用现有 `updateUserConfig` 或注册对应 IPC。
3. 修复歌词字段和 KRC 异步处理：统一 `lyricPath`，自动查找 handler 使用 `await`。
4. 修复图片链路：补 `regularNotify.error` 或统一用 `notify.error`，新增图片后同步合并后的完整列表。
5. 明确图片编辑导出设计：实现 `saveImage` IPC 或移除未完成的 Electron 保存入口。
6. 清理文档和杂项：更新 `router.md`，修正 MediaImporter 文件，确认 icon 路径和根目录零字节 `ffmpeg` 文件是否需要保留。

## Literature Checked

不适用。本次任务是项目代码交接文档生成，没有进行论文或外部资料检索。
