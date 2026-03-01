import { useEffect, useState, useCallback, use } from "react";
import { useNotification } from '../../../utils/NotificationProvider.js';
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import "./PhotoSlideShow.scss";

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const flipDirections = [
	"PhotoSlideShow_flipLeft",
	"PhotoSlideShow_flipRight",
	"PhotoSlideShow_flipTop",
	"PhotoSlideShow_flipBottom",
];

const getGridStructure = (count) => {
	if (count <= 1) return { cols: 1, rows: 1 };
	if (count === 2) return { cols: 2, rows: 1 };
	if (count === 3) return { cols: 3, rows: 1 };
	if (count === 4) return { cols: 2, rows: 2 };
	if (count <= 6) return { cols: 3, rows: 2 };
	if (count <= 9) return { cols: 3, rows: 3 };
	return { cols: 4, rows: 3 };
};

const generateLayout = (count) => {
	if (!count) return [];

	const { cols, rows } = getGridStructure(count);
	const totalCells = cols * rows;
	const extraCells = totalCells - count;

	const spansPerRow = Array(rows).fill(0);
	let remaining = extraCells;
	let r = 0;
	while (remaining > 0) {
		const maxSpansInRow = Math.floor(cols / 2);
		if (spansPerRow[r] < maxSpansInRow) {
			spansPerRow[r]++;
			remaining--;
		}
		r = (r + 1) % rows;
	}

	const layout = [];
	let id = 0;

	for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
		const spans = spansPerRow[rowIdx];
		const singles = cols - spans * 2;
		const sizes = [
			...Array(spans).fill(2),
			...Array(singles).fill(1),
		];
		for (let i = sizes.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[sizes[i], sizes[j]] = [sizes[j], sizes[i]];
		}
		let col = 0;
		for (const size of sizes) {
			layout.push({
				id: id++,
				col: `${col + 1} / ${col + 1 + size}`,
				row: `${rowIdx + 1} / ${rowIdx + 2}`,
			});
			col += size;
		}
	}

	return layout;
};

const PhotoSlideShow = ({ interval = 5000 }) => {
	const [imageList, setImageList] = useState([]);
	const [displayCount, setDisplayCount] = useState(4);
	const [tiles, setTiles] = useState([]);
	const [layout, setLayout] = useState([]);
	const notifyContext = useNotification()

	/**
	 * @description 设置窗口标题
	 */
	useEffect(() => {
		document.title = "图片幻灯片 - Utaha Player";
	}, []);

	/**
	 * @description 监听键盘事件，按 Esc 键退出幻灯片播放
	 */
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === "Escape") {
				window.electronFeatures.closeSlideShow();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	/**
	 * @description 组件挂载时获取图片列表和播放数量配置
	 */
	useEffect(() => {
		window.electronFeatures
			.getImageListShowConfig()
			.then((data) => {
				if (!data) return;
				const images = data.slideImagesCache;
				const count = Math.max(1, Math.min(12, data.photoPlayCount));
				setImageList(images);
				setDisplayCount(count);
			});
	}, []);

	/**
	 * @description 根据播放数量生成布局，每次播放数量变化或强制刷新布局时调用
	 */
	const refreshLayout = useCallback(() => {
		setLayout(generateLayout(displayCount));
	}, [displayCount]);

	/**
	 * @description 布局或图片列表变化时，初始化每个格子的图片和动画状态
	 */
	useEffect(() => {
		refreshLayout();
	}, [refreshLayout]);

	/**
	 * @description 布局或图片列表变化时，初始化每个格子的图片和动画状态
	 */
	useEffect(() => {
		if (!imageList.length || !layout.length) return;
		const initial = layout.map((tile) => ({
			...tile,
			src: getRandom(imageList).src,
			prevSrc: null,
			animation: "settled",
			key: Math.random(),
		}));
		setTiles(initial);
	}, [imageList, layout]);


	/**
	 * @description 定时替换格子图片，随机选择 1-2 个格子进行翻转或淡入动画，每次播放数量变化或强制刷新布局时重置定时器
	 */
	useEffect(() => {
		if (!imageList.length) return;
		const timer = setInterval(() => {
			setTiles((prevTiles) => {
				if (!prevTiles.length) return prevTiles;
				const replaceCount =
					Math.random() > 0.5 ? 1 : Math.min(2, prevTiles.length);
				const shuffled = [...prevTiles].sort(() => 0.5 - Math.random());
				const targets = shuffled.slice(0, replaceCount).map((t) => t.id);
				return prevTiles.map((tile) =>
					targets.includes(tile.id)
						? {
							...tile,
							prevSrc: tile.src,
							src: getRandom(imageList).src,
							animation:
								Math.random() > 0.5
									? getRandom(flipDirections)
									: "fade",
							key: Math.random(),
						}
						: tile
				);
			});
			if (Math.random() > 0.85) refreshLayout();
		}, interval);
		return () => clearInterval(timer);
	}, [imageList, interval, refreshLayout]);

	/**
	 * @description 显示提示信息的弹出框
	 */
	useEffect(() => {
		notifyContext.notify.regularNotify.info('按 Esc 键退出播放')
	}, []);

	/**
	 * @description 处理翻转动画结束事件，重置格子状态为 settled
	 */
	const handleCubeAnimationEnd = useCallback((tileId) => {
		setTiles((prev) =>
			prev.map((t) =>
				t.id === tileId
					? { ...t, prevSrc: null, animation: "settled" }
					: t
			)
		);
	}, []);

	const { cols, rows } = getGridStructure(displayCount);

	return (
		<div
			className="PhotoSlideShow_wall"
			style={{
				gridTemplateColumns: `repeat(${cols}, 1fr)`,
				gridTemplateRows: `repeat(${rows}, 1fr)`,
			}}
		>
			{tiles.map((tile) => (
				<div
					key={tile.key}
					className="PhotoSlideShow_tile"
					style={{
						gridColumn: tile.col,
						gridRow: tile.row,
					}}
				>
					{tile.animation === "fade" ? (
						<img
							className="PhotoSlideShow_img PhotoSlideShow_kenburns PhotoSlideShow_fadeIn"
							src={tile.src}
							alt=""
						/>
					) : tile.animation === "settled" ? (
						<img
							className="PhotoSlideShow_img PhotoSlideShow_kenburns"
							src={tile.src}
							alt=""
						/>
					) : (
						<div
							className={`PhotoSlideShow_cube ${tile.animation}`}
							onAnimationEnd={() => handleCubeAnimationEnd(tile.id)}
						>
							<img
								className="PhotoSlideShow_img PhotoSlideShow_cubeFace PhotoSlideShow_cubeFaceFront"
								src={tile.prevSrc}
								alt=""
							/>
							<img
								className="PhotoSlideShow_img PhotoSlideShow_cubeFace PhotoSlideShow_cubeFaceNext"
								src={tile.src}
								alt=""
							/>
						</div>
					)}
				</div>
			))}
		</div>
	);
};

export default PhotoSlideShow;