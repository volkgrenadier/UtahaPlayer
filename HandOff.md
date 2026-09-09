# Utaha Player HandOff

更新时间：2026-09-09（Asia/Singapore），版本：0.2.1

## Current Status

Utaha Player 已完成“本地优先的专业桌面媒体中心”重构。音乐、视频、图片共用版本化媒体记录、活动时间、收藏和首页摘要；旧统计首页、手工窗口移动轮询与未完成的图片保存入口已经移除。

## Implemented

- Windows 使用 Electron 原生隐藏标题栏、`titleBarOverlay` 和 CSS drag region；窗口默认为 1280×800，最小 1024×640，并启用可用时的 Mica。
- 首页展示继续播放、最近使用、最近加入、媒体库入口、全局搜索与三类文件夹导入。
- 主进程维护统一媒体库，迁移旧配置并保留未知的 `importedAt`；首页和搜索只返回有界摘要，缩略图写入 `userData/thumbnails`。
- 音乐播放器由应用级 Provider 保持跨页播放；悬浮唱片停靠侧栏交界处，首次播放后在音乐页外显示、暂停保留，展开控制磁贴离开 3 秒后自动收起（2026-09-09 更新）。
- 视频每 5 秒及暂停、切页、退出时保存进度，离开页面立即暂停；完成阈值为超过 90% 或剩余不足 30 秒。
- 图片编辑使用原图像素坐标，覆盖旋转、翻转、裁剪、滤镜、文字、涂鸦和完整撤销/重做。
- 图片默认保存副本；覆盖原图需二次确认并使用临时文件、解码验证和可回滚替换。GIF 只能保存为静态 PNG 副本。
- 收藏与最近页接入统一媒体记录；旧 `/resently` 自动重定向到 `/recent`。
- 建立统一 MUI Theme/CSS tokens、专业深色界面、响应式侧栏、reduced-motion 和可见焦点样式。

## Validation

- `npm test -- --watchAll=false --runInBand`：18 suites / 91 tests passed。
- `npx eslint src --ext .js --max-warnings=0`：0 warnings。
- `npm run build`：production build passed。
- Electron Windows 启动冒烟通过，FFmpeg、FFprobe、协议和 IPC 注册无运行时错误。
- 浏览器逐页验收：首页、音乐、视频、图片、最近、收藏均无错误覆盖层或 1280px 横向溢出；可见图标按钮均有无障碍名称。
- 悬浮播放器通过 1024×640、1280×800、1920×1080 布局及 Electron 125%/150% 缩放验收；播放/暂停、焦点、自动收起、窗外松开滑块和 reduced-motion 行为通过。

## Windows Packaging

- `package.json` 与锁文件版本同步为 0.2.1；先运行 `npm run build`，再运行 `npm run make -- --platform=win32 --arch=x64` 生成 Squirrel 安装包。
- `forge.config.js` 使用 `asar.unpack` 解包 FFmpeg/FFprobe，并排除临时预览、开发缓存和测试文件。
- `src/main/binaryPaths.js` 优先返回物理解包路径，保留 FFprobe 的平台/架构子目录；安装器生命周期由 `electron-squirrel-startup` 处理。

## Manual Acceptance Still Required

以下项目依赖真实鼠标、显示器和用户媒体，不能由当前自动化完整代替：

- Windows 100%/150% DPI、跨显示器拖动、Snap Layout、Alt+Tab 与窗外松开。
- 拖动时 CPU、动画帧间隔和真实视频丢帧率，与旧实现的基线对照。
- 系统保存/覆盖对话框、文件权限失败与真实 JPEG/PNG/GIF 的端到端人工确认。
- macOS/Linux 的启动、拖动、导航和保存冒烟。

## Commands

```powershell
npm start
npm run electron
npm test -- --watchAll=false --runInBand
npx eslint src --ext .js --max-warnings=0
npm run build
```

## Key Files

- `src/main.js`：主窗口、媒体导入、媒体 IPC、视频转码与安全图片保存。
- `src/main/mediaLibrary.js`：版本化媒体模型、迁移、搜索、活动、收藏与首页摘要。
- `src/main/imageSaveHelpers.js`：原子写入、验证、备份与回滚。
- `src/config/preload.js`：固定用途、窄权限渲染 API。
- `src/context/MusicPlayerContext.js`：全局音乐会话。
- `src/component/Home/HomeGuide.js`：内容首页。
- `src/component/Photo/PhotoEditor/`：源像素编辑文档与编辑器。
- `src/theme.js`、`src/style/public.scss`：设计系统。
