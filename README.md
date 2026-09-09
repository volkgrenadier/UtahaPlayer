# Utaha Player

Utaha Player 是一个本地优先的桌面媒体中心，以统一媒体库管理音乐、视频与图片。媒体文件和活动记录保存在本机，不依赖账号或云端服务。

## 核心体验

- 内容型首页：继续播放、最近使用、最近加入和三类媒体库入口
- 全局音乐播放：跨页面保持播放，通过侧栏交界处的悬浮唱片控制；首次播放后出现，暂停保留，展开后离开 3 秒自动收起
- 视频进度：离开播放页自动暂停并保存进度
- 图片工作区：原始分辨率编辑、完整撤销/重做、保存副本或安全覆盖
- 统一媒体活动：搜索、最近记录和收藏使用同一媒体模型
- 原生桌面交互：Windows 原生窗口拖动、Snap Layout 与 Mica 材质

## 技术栈

- Electron
- React 19 / React Router
- Material UI 6
- Electron Store
- Konva / React Konva
- FFmpeg / FFprobe / music-metadata

## 本地开发

安装依赖后，启动 React 开发服务器：

```bash
npm start
```

另开终端启动 Electron：

```bash
npm run electron-trace
```

运行验证：

```bash
npm test -- --watchAll=false
npm run build
```

## 数据与保存安全

Utaha Player 只向渲染层暴露固定用途的媒体 API，不开放任意文件写入。图片编辑默认“保存副本”；覆盖原图需要显式确认，写入流程使用同目录临时文件验证并提供回滚保护。GIF 编辑结果只允许保存为静态 PNG。

## 项目沿革

项目最初以霞ヶ丘詩羽主题实验界面起步；相关素材仅作为项目历史保留，不再承担主产品界面的视觉表达。
