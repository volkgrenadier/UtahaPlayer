# Utaha Player Detailed HandOff

更新时间：2026-09-09（Asia/Singapore）

## 1. Product and Stack

Utaha Player 0.2.1 是本地优先的 Electron 桌面媒体中心，统一管理音乐、视频与图片，不依赖账号或云服务。

- Electron 34
- React 19 / React Router 6 data router
- Material UI 6
- electron-store
- music-metadata
- FFmpeg / FFprobe
- Konva / React Konva
- Sass

## 2. Startup and Window Model

主进程入口是 `src/main.js`。`initStore()` 初始化 electron-store、迁移统一媒体库并设置 `userData/thumbnails` 缓存目录；随后创建主窗口并注册固定 IPC。

Windows 安装/更新/卸载事件交由 `electron-squirrel-startup` 处理，避免安装过程中启动主界面。FFmpeg 与 FFprobe 使用 `asar.unpack` 保留为独立可执行文件，`src/main/binaryPaths.js` 保留原有子目录并优先解析物理解包路径。打包排除 `.tmp`、开发缓存、代理配置和源码测试，版本号以 `package.json` 及锁文件为准。

窗口参数集中在 `src/main/windowOptions.js`：

- 默认 1280×800，最小 1024×640。
- Windows/Linux 使用 `titleBarStyle: hidden` 与 `titleBarOverlay`；macOS 使用 `hiddenInset`。
- Windows 尝试启用 Mica，失败时回退纯色。
- `nodeIntegration: false`、`contextIsolation: true`。
- 标题栏 `.Header_container` 使用原生 `app-region: drag`，不再存在 8ms 光标轮询、`setBounds` 或通用窗口命令 IPC。

## 3. Renderer Architecture

`src/index.js` 使用 `createHashRouter` 和 `RouterProvider`，这样图片编辑器可以在 SPA 路由离开时拦截未保存修改。`src/App.js` 在普通页面外层提供：

1. `NotificationProvider`
2. `MusicPlayerProvider`
3. Header
4. LeftNav
5. route content
6. global MiniPlayer

`/slideshow` 使用独立的极简全屏布局。

当前路由：

- `/`：内容首页
- `/music`：音乐库与沉浸播放
- `/video`：视频工作区
- `/photo`：图片库与编辑工作区
- `/collect`：统一收藏
- `/recent`：真实活动记录
- `/resently`：重定向到 `/recent`
- `/slideshow`：独立幻灯片窗口

## 4. Unified Media Library

`src/main/mediaLibrary.js` 是媒体记录的唯一规范化入口。记录包含稳定 ID、记录版本、类型、路径、标题、缩略图 URL、`importedAt`、`lastAccessedAt`、收藏和播放进度。

迁移规则：

- 从旧 music/video/photo 列表幂等合并并按稳定 ID 去重。
- 旧记录缺失 `importedAt` 时保持 `null`，不伪造最近加入时间。
- 新导入记录才写入导入时间。
- 旧配置视图仍由 canonical records 同步生成，便于现有播放器渐进迁移。

首页摘要默认每区 12 条，最大 24 条；搜索默认 30 条，最大 100 条。摘要会删除 Base64 封面，只返回磁盘缩略图 URL。10,000 条记录的摘要大小有自动测试保证低于 250KB。

## 5. Imports and Thumbnails

首页的音乐、视频、图片入口都是真实文件夹导入。`src/main/mediaImportHelpers.js` 递归扫描白名单扩展名、跳过符号链接，并将单次导入限制为 20,000 个文件。

- 音乐：读取 metadata，封面转为磁盘缓存后加入统一库。
- 视频：不支持浏览器直接播放的格式先由 FFmpeg 转码，再读取 FFprobe 信息并加入统一库。
- 图片：合并、去重并持久化；不会用本次选择替换既有记录。

缩略图由 `src/thumbnailHelper.js` 写入 `app.getPath('userData')/thumbnails`，渲染层不再读取整库 Base64。

## 6. Playback Sessions

`src/context/MusicPlayerContext.js` 拥有唯一的全局 `<audio>` 会话。切换首页、视频、图片、最近或收藏不会停止音乐。会话标记 `hasPlaybackStarted` 在实际播放事件发生后置为 true，暂停时保留，应用重启后重置，不写入配置。

`src/component/Player/MiniPlayer.js` 使用深梅色悬浮唱片磁贴：首次播放后在音乐页外显示，无当前歌曲或进入音乐页、幻灯片窗口时隐藏。64px 唱片圆心位于侧栏交界处、距窗口底部 136px；有封面时圆形裁切，缺失或加载失败时回退默认黑胶。播放时 12 秒旋转一圈，暂停保持角度，悬停或键盘聚焦时显示下一次点击执行的播放/暂停动作。

右箭头在 240ms 内展开 420×112px 控制磁贴，保留标题、艺术家、上一首、播放/暂停、下一首、进度、时间和音量；歌曲信息按钮进入音乐页。鼠标离开整个区域、没有键盘焦点且没有滑块拖动时，3 秒后自动收起；重新进入会取消计时。左箭头或 Escape 立即收起，键盘收起返回展开按钮。普通页面切换时恢复收起，关闭状态的控制区域禁用且 inert，不截获鼠标或键盘焦点。页面布局不再预留底栏高度，系统减少动态效果时停用旋转和过渡。

视频仍由视频页拥有：

- 开始视频播放时暂停全局音乐。
- 每 5 秒、暂停、换片、切页和页面退出时保存进度。
- 离开视频页立即暂停并清空 video source。
- 播放比例严格超过 90%，或剩余时间严格不足 30 秒时标记完成并从继续播放移除。
- 首页携带 `mediaId`/`mediaPath` 路由状态，可恢复音乐和视频进度。

## 7. Photo Editing and Save Safety

`src/component/Photo/PhotoEditor/editorDocument.js` 将编辑文档与屏幕视图分离：

- 文档尺寸、仿射矩阵、裁剪、滤镜、文字和线条使用原图像素坐标。
- 缩放和平移只影响预览。
- 导出 canvas 使用完整文档分辨率，90° 旋转交换宽高。
- Konva 辅助框、遮罩和 Transformer 不参与导出。
- 所有文档操作进入同一撤销/重做时间线。

编辑器支持按住查看原图、dirty 标记、切图确认、`beforeunload` 和 SPA 路由离开确认。

保存通过 `save-edited-image` 固定 IPC 完成：

- 主操作是“保存副本”，默认 `<原名>-edited.<ext>`。
- JPEG/PNG 保持格式，JPEG 质量为 92。
- 覆盖显示完整路径并二次确认。
- GIF 禁止覆盖，只能输出静态 PNG，并返回扁平化警告。
- 主进程验证 source 属于图片库，限制 raster 为 250MB，使用 nativeImage 解码/重新编码。
- `writeFileAtomically()` 在同目录写临时文件、验证、备份、替换；索引或配置持久化失败时也会恢复原文件。
- 成功后刷新缩略图并返回规范化图片记录；副本追加并选中，覆盖刷新当前记录。

## 8. Preload and IPC Boundary

`src/config/preload.js` 不暴露任意 channel、任意配置写入或任意文件写入。主要固定 API：

- bounded home/search/recent/favorite queries
- playback progress/activity/favorite updates
- fixed music/video player preferences
- fixed music/video/photo import methods
- library add/remove methods
- lyrics methods
- slideshow methods
- `saveEditedImage`

渲染事件订阅使用 allowlist，并返回精确 listener cleanup。文件存在性检查、图片删除、图片保存和幻灯片选择都会在主进程再次验证媒体记录。

## 9. Design System

`src/theme.js` 与 `src/style/public.scss` 定义统一字体、深色中性色、单一靛蓝强调色、4/8px 间距节奏、8/12/16px 圆角、阴影、语义色和 120/180/240ms 动效。

- 侧栏默认图标+文字，1120px 以下折叠到 72px，不覆盖正文。
- 内容封面和图片承担情绪色，动漫素材不再进入主界面。
- 品牌使用中性的 U + 波形标识。
- 动效尊重 `prefers-reduced-motion`。
- 键盘焦点有统一 focus ring；可见图标按钮均有无障碍名称。

## 10. Test Coverage

自动测试当前覆盖 9 个套件、44 项：

- 配置迁移、导入合并、稳定 ID 和旧时间保留
- 首页排序、继续播放边界、10,000 条摘要大小
- 收藏与活动记录
- 文件夹递归扫描、扩展名白名单和数量上限
- 图片副本命名、buffer 限制、原子替换和回滚
- 编辑矩阵、旋转、翻转、裁剪与导出尺寸
- 首页 loading/empty/error/real summary
- 全局音乐跨页状态与进度恢复
- route media selection、file URL 编码、窗口参数

常用命令：

```powershell
npm test -- --watchAll=false --runInBand
npx eslint src --ext .js --max-warnings=0
npm run build
```

## 11. Remaining Manual Checks

功能实现已落地，尚需在发布前由目标机器人工确认：

- Windows 拖动 CPU、帧间隔、视频 dropped frames 与旧版基线对比。
- 100%/150% DPI、跨显示器、Snap Layout、最大化恢复、窗外松开和 Alt+Tab。
- 真实文件权限失败、磁盘空间不足、JPEG/PNG/GIF 保存对话框与覆盖回滚。
- 1024×640、1280×800、1600×900 的最终视觉签收。
- macOS/Linux 启动、拖动、导航和保存冒烟。

这些是硬件/操作系统级发布验收，不代表仍有已知代码阻塞项。
