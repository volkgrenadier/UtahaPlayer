import React, { useState, useCallback, useRef, useLayoutEffect, useEffect } from 'react'
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Tooltip from '@mui/material/Tooltip';
import { useNotification } from '../../utils/NotificationProvider.js';
import PhotoEditor from './PhotoEditor/PhotoEditor.js';
import './Photo.scss'

import testImage from '../../assets/2.jpg';
import testImage2 from '../../assets/1.jpg';

const Photo = () => {
    // 当前选中的图片
    const [selectedImage, setSelectedImage] = useState(null);
    // 图片列表
    // const [imageList, setImageList] = useState([
    //     {
    //         src: testImage,
    //         title: 'Breakfast',
    //         rows: 2,
    //         cols: 2,
    //     },
    //     {
    //         src: testImage2,
    //         title: 'Burger',
    //     },
    //     {
    //         src: testImage,
    //         title: 'Camera',
    //     },
    //     {
    //         src: testImage2,
    //         title: 'Coffee',
    //         cols: 2,
    //     },
    //     {
    //         src: testImage,
    //         title: 'Hats',
    //         cols: 2,
    //     },
    //     {
    //         src: testImage,
    //         title: 'Honey',
    //         author: '@arwinneil',
    //         rows: 2,
    //         cols: 2,
    //     },
    //     {
    //         src: testImage2,
    //         title: 'Basketball',
    //     },
    //     {
    //         src: testImage,
    //         title: 'Fern',
    //     },
    //     {
    //         src: testImage,
    //         title: 'Mushrooms',
    //         rows: 2,
    //         cols: 2,
    //     },
    //     {
    //         src: testImage,
    //         title: 'Tomato basil',
    //     },
    //     {
    //         src: testImage2,
    //         title: 'Sea star',
    //     },
    //     {
    //         src: testImage,
    //         title: 'Bike',
    //         cols: 2,
    //     },
    // ])
    const [imageList, setImageList] = useState([]);
    const [photoPlayCount, setPhotoPlayCount] = useState(4);
    const playCountButtonRef = useRef(null);
    // 展开的二级菜单的索引
    const [activeMenu, setActiveMenu] = useState(null);
    // 右键菜单状态：记录鼠标位置和右键点击的目标图片，null 表示菜单关闭
    const [contextMenu, setContextMenu] = useState(null);
    // 通知组件
    const notifyContext = useNotification()
    const buttonList = [
        {
            icon: <AddPhotoAlternateIcon />,
            tooltip: '打开图片',
            onClick: async () => {
                let res = await window.electronFeatures.getImages()
                if (res && res.length > 0) {
                    let newImageList = [...imageList, ...res];
                    let updatedImageList = updateImagesRowsAndCols(newImageList);
                    setImageList(updatedImageList)
                } else {
                    console.warn('没有找到图片文件')
                }
            }
        },
        {
            icon: <FolderOpenIcon />,
            tooltip: '打开文件夹',
            onClick: async () => {
                let res = await window.electronFeatures.getImages('directory')
                if (res && res.length > 0) {
                    let newImageList = [...imageList, ...res];
                    let updatedImageList = updateImagesRowsAndCols(newImageList);
                    console.log(updatedImageList)
                    setImageList(updatedImageList)
                } else {
                    console.warn('没有找到图片文件')
                }
            }
        },
        {
            icon: <SmartDisplayIcon />,
            tooltip: '播放',
            onClick: async () => {
                // 播放
                if (imageList.length > 0) {
                    window.electronFeatures.sendMessage('open-slide-show', {
                        imageList,
                        photoPlayCount
                    })
                }
            },
            secondButton: {
                icon: <ArrowDropDownIcon />,
                tooltip: '播放数量设置',
                ref: playCountButtonRef,
                className: 'Photo_subButton_sideAttach Photo_subButton_playCount',
                // 用于标识哪个二级菜单被打开了
                secondaryMenuName: 'photoPlayCount',
                valueRange: [1, 12],
                onClick: async (e) => {
                    e.stopPropagation();
                    setActiveMenu(prev =>
                        prev === 'photoPlayCount' ? null : 'photoPlayCount'
                    );
                }
            }
        },
        {
            icon: <PlaylistRemoveIcon />,
            tooltip: '清空图片列表',
            tone: 'danger',
            onClick: async () => {
                handleClearImages();
            }
        }
    ]
    /**
     * @description 处理图片列表，根据图片的索引生成图片的行数和列数，其生成是行数和列数要满足排布方式，排布方式为：以每四张图片为"一组"，每组的总行数为2，列数为4，奇数组四张图片占据的行列数分别为：
     * 1. 第一张图片占据2行2列
     * 2. 第二张图片占据1行1列
     * 3. 第三张图片占据1行1列
     * 4. 第四张图片占据1行2列
     * 偶数组四张图片占据的行列数分别为：
     * 1. 第一张图片占据1行2列
     * 2. 第二张图片占据2行2列
     * 3. 第三张图片占据1行1列
     * 4. 第四张图片占据1行1列
     * @param {number} list 图片列表
     */
    const updateImagesRowsAndCols = (list = []) => {
        let oldList = Array.isArray(list) ? [...list] : [];
        let updatedList = oldList.map((item, index) => {
            let groupIndex = Math.floor(index / 4); // 计算当前图片所在的组
            let isOddGroup = groupIndex % 2 === 1; // 判断当前组是奇数组还是偶数组
            let rows, cols;
            let imageSeq = index + 1; // 从1开始计数
            if (isOddGroup) {
                // 奇数组
                if (imageSeq % 4 === 1) {
                    rows = 2;
                    cols = 2;
                } else if (imageSeq % 4 === 2 || imageSeq % 4 === 3) {
                    rows = 1;
                    cols = 1;
                } else {
                    rows = 1;
                    cols = 2;
                }
            } else {
                // 偶数组
                if (imageSeq % 4 === 1) {
                    rows = 1;
                    cols = 2;
                } else if (imageSeq % 4 === 2) {
                    rows = 2;
                    cols = 2;
                } else {
                    rows = 1;
                    cols = 1;
                }
            }
            let obj = {
                rows: 1,
                cols: 1,
            }
            if (typeof(item) === 'string') {
                obj.src = item;
            } else {
                obj = {
                    ...item,
                    rows: rows,
                    cols: cols
                }
            }
            return obj
        })
        return updatedList;
    }

    /**
     * @description 生成图片的 srcset 属性
     * @param {string} src 图片源地址
     * @param {number} size 图片的宽高
     * @param {number} rows 图片的行数，默认为1
     * @param {number} cols 图片的列数，默认为1
     * @returns {object} 包含 src 和 srcSet 属性的对象
     */
    const srcset = useCallback((src, size, rows = 1, cols = 1) => {
        // 本地文件路径无法通过查询参数裁剪
        // 直接返回原始 src，避免浏览器以 src + srcSet 双倍加载原始大图
        const isLocalFile = !src.startsWith('http://') && !src.startsWith('https://');
        if (isLocalFile) {
            return { src };
        }
        return {
            src: `${src}?w=${size * cols}&h=${size * rows}&fit=crop&auto=format`,
            srcSet: `${src}?w=${size * cols}&h=${size * rows}&fit=crop&auto=format&dpr=2 2x`,
        }
    }, [])


    /**
     * @description 组件加载完成后，获取缓存的图片和播放信息设置，设置图片列表的行列数
     */
    useLayoutEffect(() => {
        window.electronFeatures.getImageListShowConfig().then(cachedConfig => {
            if (cachedConfig) {
                const updatedImageList = updateImagesRowsAndCols(cachedConfig.slideImagesCache || []);
                setImageList(updatedImageList);
                setPhotoPlayCount(cachedConfig.photoPlayCount || 4);
                console.log(updatedImageList)
            } else {
                setImageList([]);
            }
        }).catch(err => {
            console.error('获取图片列表幻灯片播放配置失败', err);
            setImageList([]);
        });
    }, []);

    /**
     * @description 点击图片时，设置当前选中的图片，并重置图片的放大和移动状态
     * @param {object} item 图片对象
     */
    const handleImageClick = (item) => {
        setSelectedImage(item);
        // resetImageTransform();
    }
    /**
     * @description 从图片列表中移除图片，如果当前选中的图片被移除，则重置图片放大和移动状态并将当前选中的图片为null
     * @param {object} item 图片对象
     */
    const handleRemoveImage = (item) => {
        const updatedImageList = imageList.filter(image => image.src !== item.src);
        let updatedImageListWithRowsAndCols = updateImagesRowsAndCols(updatedImageList);
        setImageList(updatedImageListWithRowsAndCols);
        window.electronFeatures.updateSlideShowConfig(updatedImageListWithRowsAndCols, undefined);
        if (selectedImage && selectedImage.src === item.src) {
            setSelectedImage(null);
        }
    }
    /**
     * @description 清除图片列表
     * 
     */
    const handleClearImages = () => {
        setImageList([]);
        setSelectedImage(null);
        window.electronFeatures.updateSlideShowConfig([], undefined);
        // resetImageTransform();
    }
    /**
     * @description 选择播放数量的二级菜单项时，设置播放数量，并关闭二级菜单
     */
    const setPhotoPlayCountAndUpdateStoredData = (count) => {
        setPhotoPlayCount(count);
        window.electronFeatures.updateSlideShowConfig(undefined, count);
        setActiveMenu(null);
    }

    // ── 右键菜单 ──────────────────────────────────────

    /**
     * @description 打开右键菜单，阻止浏览器默认菜单，记录鼠标位置和目标图片
     * @param {MouseEvent} e
     * @param {object} item 右键点击的图片对象
     */
    const handleContextMenu = (e, item) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, item });
    }

    /**
     * @description 关闭右键菜单
     */
    const handleContextMenuClose = () => {
        setContextMenu(null);
    }

    /**
     * @description 右键菜单 → 从列表中移除，不影响本地文件
     */
    const handleContextRemove = () => {
        handleRemoveImage(contextMenu.item);
        handleContextMenuClose();
    }

    /**
     * @description 右键菜单 → 删除本地图片
     * 从列表移除后，通知主进程删除本地文件并更新幻灯片配置
     */
    const handleContextDeleteLocal = () => {
        const targetSrc = contextMenu.item.src;
        const updatedImageList = imageList.filter(image => image.src !== targetSrc);
        let updatedImageListWithRowsAndCols = updateImagesRowsAndCols(updatedImageList);
        setImageList(updatedImageListWithRowsAndCols);
        if (selectedImage && selectedImage.src === targetSrc) {
            setSelectedImage(null);
            // resetImageTransform();
        }
        window.electronFeatures.deleteImageFile(targetSrc, updatedImageListWithRowsAndCols)
        .then((res) => {
            if (res && res.success) {
                notifyContext.notify.regularNotify.info(res.message || '图片删除成功')
            } else {                
                notifyContext.notify.regularNotify.error(res.message || '图片删除失败')
            }
            
        }).catch(err => {
            notifyContext.notify.regularNotify.error('图片删除失败')
        })
        handleContextMenuClose();
    }

    return (
        <div className='Photo_container'>
            <div className="Photo_imageListContainer">
                <div className="Photo_imageListHeader">
                    <div className='Photo_toolbar'>
                        <div className='Photo_toolbarButtons'>
                            {
                                buttonList.map((button, index) => (
                                    <div className={`Photo_buttonGroup ${button.secondButton ? 'Photo_buttonGroup_combo' : ''}`} key={index}>
                                        <Tooltip key={index} title={button.tooltip}>
                                            <button
                                                className={`Photo_button ${button.tone === 'danger' ? 'Photo_button_danger' : ''}`}
                                                type='button'
                                                aria-label={button.tooltip}
                                                onClick={button.onClick}
                                            >
                                                {button.icon}
                                            </button>
                                        </Tooltip>
                                            {
                                                button.secondButton && (
                                                    <div className='Photo_secondaryButton_container'>
                                                        <Tooltip title={button.secondButton.tooltip}>
                                                            <button
                                                                ref={button.secondButton.ref}
                                                                className={`Photo_button photo_secondaryButton ${button.secondButton.className} ${
                                                                    activeMenu === button.secondButton.secondaryMenuName? 'active' : ''
                                                                }`}
                                                                type='button'
                                                                aria-label={button.secondButton.tooltip}
                                                                onClick={button.secondButton.onClick}
                                                            >
                                                                {button.secondButton.icon}
                                                            </button>
                                                        </Tooltip>
                                                        <div className={`Photo_playCountMenu ${activeMenu === button.secondButton.secondaryMenuName ? 'open' : ''}`}>
                                                            {
                                                                button.secondButton.valueRange &&
                                                                Array.from(
                                                                    { length: button.secondButton.valueRange[1] - button.secondButton.valueRange[0] + 1 },
                                                                    (_, i) => i + button.secondButton.valueRange[0]
                                                                ).map((num) => (
                                                                    <button
                                                                        key={num}
                                                                        className={`Photo_playCountItem ${
                                                                            photoPlayCount === num ? 'active' : ''
                                                                        }`}
                                                                        type='button'
                                                                        onClick={() => {
                                                                            setPhotoPlayCountAndUpdateStoredData(num);
                                                                        }}
                                                                    >
                                                                        {num}
                                                                    </button>
                                                                ))
                                                            }
                                                        </div>
                                                    </div>
                                                )
                                            }
                                    </div>
                                ))
                            }
                        </div>
                        <div className='Photo_toolbarMeta'>
                            <span>{imageList.length} 张</span>
                            <span>{photoPlayCount} 格播放</span>
                        </div>
                    </div>
                </div>
                <ImageList
                    // sx={{ width: 1, height: 1 }}
                    className='Photo_imageList'
                    variant="quilted"
                    cols={4}
                    rowHeight={121}
                >
                    {
                        imageList.map((item) => (
                            <ImageListItem 
                                className='Photo_imageListItem'
                                key={item.src} 
                                cols={item.cols || 1} 
                                rows={item.rows || 1}
                                onClick={() => handleImageClick(item)}
                                onContextMenu={(e) => handleContextMenu(e, item)}
                            >
                                <img
                                    src={item.thumb || item.src}
                                    alt={item.title}
                                    loading="lazy"
                                />
                            </ImageListItem>
                        ))
                    }
                </ImageList>
            </div>

            {/* 右键菜单 */}
            <Menu
                open={!!contextMenu}
                onClose={handleContextMenuClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={handleContextRemove}>
                    <ListItemIcon>
                        <DeleteOutlineIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>从列表中移除</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleContextDeleteLocal} sx={{ color: 'error.main' }}>
                    <ListItemIcon sx={{ color: 'error.main' }}>
                        <DeleteForeverIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>删除本地图片</ListItemText>
                </MenuItem>
            </Menu>

            <div 
                className="Photo_displayArea"
            >
                {selectedImage ? (
                    <PhotoEditor selectedImage={selectedImage} />
                ) : (
                    <div className="Photo_placeholder">请选择一张图片</div>
                )}
            </div>
        </div>
    )
}

export default Photo
