<div align="center">

<a href="./README.md"><strong>中文</strong></a> · <a href="./README.en.md">English</a>

<br>

<img src="./README.assets/utaha_min.png" alt="诗羽主题插画" width="128">

# Utaha Player

**把喜欢的旋律、故事与画面，留在身边。**

本地优先的桌面媒体中心 · 音乐 / 视频 / 图片

✒️ 以书页为证，以黑胶为誓。作者君，今天也请好好交稿。

**[下载 Windows 版](https://github.com/volkgrenadier/UtahaPlayer/releases/download/v0.2.1/Utaha.Player-0.2.1.Setup.exe)** · [v0.2.1 发布说明](https://github.com/volkgrenadier/UtahaPlayer/releases/tag/v0.2.1) · [反馈与建议](https://github.com/volkgrenadier/UtahaPlayer/issues)

</div>

> 「既然点开了，就坐下来听完这首歌吧。至于更新……作者君，我可还记得你上次说的『明天一定』。」

Utaha Player 用一个媒体库收纳本地音乐、视频和图片。文件与活动记录保存在本机，无需账号；打开应用，就能从上次停下的地方继续。

这里有一点深梅色、一点莓红，也有一点「诗羽教」的私心：喜欢的东西好好收藏，没写完的故事留待续章，没播完的歌接着听。

## ✨ 你的本地放映室，也是唱片店

| | 可以做什么 |
| --- | --- |
| 🎵 音乐与歌词 | 黑胶唱片视觉、沉浸式歌词、播放列表，以及顺序、随机和单曲循环播放。 |
| 📀 悬浮唱片 | 离开音乐页也能继续听。封面随唱片旋转，悬停即可播放或暂停，展开后可切歌、调整进度和音量。 |
| 🎬 视频续播 | 保存播放进度，离开视频页自动暂停，下次接着看。 |
| 🖼️ 图片工作区 | 预览与幻灯片播放；按原始分辨率裁剪、旋转、翻转、调色、添加文字或涂鸦，支持撤销与重做。 |
| 🗂️ 统一媒体库 | 首页汇总继续播放、最近使用和最近加入；搜索、收藏与活动记录相互衔接。 |
| 🪟 桌面细节 | 原生窗口拖动、响应式侧栏、可用时的 Windows Mica，以及键盘焦点和减少动态效果支持。 |

## 📸 先看看，再入座

以下截图来自 **v0.2.1 Windows 安装版**，使用仓库内的插画与本地演示媒体。

### 从这里，继续。

![首页与展开的悬浮播放器](./README.assets/screenshots/home-v0.2.1.png)

### 唱片小小一张，控制随手可及

<table>
  <tr>
    <th>收起 · 让出空间</th>
    <th>悬停 · 一键播放 / 暂停</th>
    <th>展开 · 控制都在这里</th>
  </tr>
  <tr>
    <td align="center"><img src="./README.assets/screenshots/mini-collapsed-v0.2.1.png" alt="收起状态下的唱片与展开按钮" width="140"></td>
    <td align="center"><img src="./README.assets/screenshots/mini-hover-v0.2.1.png" alt="鼠标悬停唱片时显示暂停按钮" width="140"></td>
    <td align="center"><img src="./README.assets/screenshots/mini-expanded-v0.2.1.png" alt="展开的深梅色磁贴，包含播放、进度和音量控制" width="540"></td>
  </tr>
</table>

本次启动首次播放音乐后，唱片才会出现；暂停时仍然保留。有封面就展示封面，没有封面就用默认黑胶。点击箭头向右展开，离开播放器 3 秒后自动收起，也可以按 `Escape` 收起。

<details>
<summary>🎵 打开音乐页：唱针已经落下</summary>

![音乐页的黑胶唱片与播放控制](./README.assets/screenshots/music-v0.2.1.png)

</details>

<details>
<summary>🖼️ 打开图片工作区：把喜欢的一帧留下来</summary>

![图片编辑器、媒体库和保存副本入口](./README.assets/screenshots/photo-editor-v0.2.1.png)

</details>

## 📦 带一份回去

当前预编译安装包为 **Windows x64 · v0.2.1**。

1. [下载安装包](https://github.com/volkgrenadier/UtahaPlayer/releases/download/v0.2.1/Utaha.Player-0.2.1.Setup.exe)，运行 `Utaha.Player-0.2.1.Setup.exe`。
2. 打开应用，在首页的「导入媒体」中选择音乐、视频或图片文件夹。
3. 播放一首歌，再切回首页，试试侧栏旁的悬浮唱片。

[Release 页面](https://github.com/volkgrenadier/UtahaPlayer/releases/tag/v0.2.1) 同时提供更新文件和 `SHA256SUMS.txt` 校验文件。安装版无需配置开发环境。

## 🗝️ 关于你的收藏

- 导入的媒体仍保留在原来的位置；媒体索引、播放进度、偏好与缩略图保存在应用的本地数据目录。
- 图片编辑默认「保存副本」。选择覆盖原图时，需要确认，并经过文件验证与可回滚替换。
- GIF 的编辑结果导出为静态 PNG。

## 🛠️ 给愿意一起写下一章的人

需要 Node.js 与 npm。源码请使用 `master` 分支；首次安装依赖会下载 Electron、FFmpeg 等文件。

```bash
git clone --branch master https://github.com/volkgrenadier/UtahaPlayer.git
cd UtahaPlayer
npm ci
```

在第一个终端启动前端：

```bash
npm start
```

在第二个终端启动桌面应用：

```bash
npm run electron
```

验证与生产构建：

```bash
npm test -- --watchAll=false --runInBand
npx eslint src --ext .js --max-warnings=0
npm run build
```

在 Windows 上生成 x64 安装包：

```bash
npm run build
npm run make -- --platform=win32 --arch=x64
```

安装包输出到 `out/make/squirrel.windows/x64/`。

**技术栈：** Electron 34 · React 19 · React Router · Material UI 6 · electron-store · Konva / React Konva · FFmpeg / FFprobe · music-metadata。

v0.2.1 发布时已通过 **18 组 / 91 项测试**、代码检查与生产构建，并完成安装版启动、媒体读取、播放器交互及多分辨率 / 缩放验收。

## ✒️ 诗羽教 · 作者君召还仪式

> 作者君啊，作者君——
>
> 新的一页已经铺好，冷掉的咖啡也替你换过了。
>
> 你的下一次更新，难道还藏在「明天一定」的书签里吗？
>
> **𓀃𓀅𓀇𓀋𓀌**
>
> 魂兮归来……驱长鞭而架六辔兮，携未完的章节归来。
>
> **𓀌𓀎𓀠𓀤𓀫**
>
> 魂兮归来……翻山而歌兮，循唱针落下的方向归来。
>
> **𓀋𓀌𓀎𓀙𓀠**
>
> 魂兮归来……振高歌而凯旋兮，莫让等你的书页又添一层灰。
>
> **𓀋𓀠𓀤𓀥𓀫**
>
> 魂兮归来……学姐已经合上了书，留给你的那一页，还空着呢。

### 据本教不完全可靠的观察

| 作者君的更新次数 | 书桌旁会发生的事 |
| --- | --- |
| **一更** | 细微的瑕疵会被放大，生涩的代码会被红笔圈出。「这里，重写。别用那种眼神看我。」 |
| **两更** | 些许耐心开始诞生，大家终于愿意多看一眼故事的进展。「下一章……我会顺手看看的。」 |
| **三更** | 零星的赞扬开始发声，沉睡的收藏慢慢苏醒，默默离席的人也渐渐少了。 |
| **五更** | 读者的维护自发形成，夸奖愈发响亮。「他有在认真改。你看，这一段就很好。」 |
| **十更** | 大儒的辩经震耳欲聋，宽容贯彻书桌内外。「妙啊，这叫霞诗子式的叙事留白！」 |

**今日教义：歌可以单曲循环，作者君不必循环「明天一定」。**

催更请温柔，反馈请具体。欢迎带着复现步骤、运行环境或截图来 [提 Issue](https://github.com/volkgrenadier/UtahaPlayer/issues)，也欢迎提交改进。让下一次更新，真的值得等。

---

Utaha 之名向霞ヶ丘詩羽致意。页首插画沿用项目已有素材，学姐口吻的文案与召还仪式为项目趣味改写。

<div align="center">

**愿歌单永不完结，愿下一章如期而至。**

<a href="./README.md"><strong>中文</strong></a> · <a href="./README.en.md">English</a>

</div>
