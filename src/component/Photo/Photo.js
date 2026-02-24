import React, { useState, useCallback, useRef, useLayoutEffect, useEffect } from 'react'
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import Tooltip from '@mui/material/Tooltip';
import PhotoEditor from './PhotoEditor/PhotoEditor.js';
import './Photo.scss'

import testImage from '../../assets/2.jpg';
import testImage2 from '../../assets/1.jpg';

const Photo = () => {
    // 当前选中的图片
    const [selectedImage, setSelectedImage] = useState(null);
    // 图片列表
    const [imageList, setImageList] = useState([
        {
            src: testImage,
            title: 'Breakfast',
            rows: 2,
            cols: 2,
        },
        {
            src: testImage2,
            title: 'Burger',
        },
        {
            src: testImage,
            title: 'Camera',
        },
        {
            src: testImage2,
            title: 'Coffee',
            cols: 2,
        },
        {
            src: testImage,
            title: 'Hats',
            cols: 2,
        },
        {
            src: testImage,
            title: 'Honey',
            author: '@arwinneil',
            rows: 2,
            cols: 2,
        },
        {
            src: testImage2,
            title: 'Basketball',
        },
        {
            src: testImage,
            title: 'Fern',
        },
        {
            src: testImage,
            title: 'Mushrooms',
            rows: 2,
            cols: 2,
        },
        {
            src: testImage,
            title: 'Tomato basil',
        },
        {
            src: testImage2,
            title: 'Sea star',
        },
        {
            src: testImage,
            title: 'Bike',
            cols: 2,
        },
    ])
    const buttonList = useRef([
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
            onClick: () => {
                // 播放
            }
        },
        {
            icon: <PlaylistRemoveIcon />,
            tooltip: '清空图片列表',
            onClick: async () => {
                setImageList([]);
                setSelectedImage(null);
                // resetImageTransform();
            }
        }
    ])
    /**
     * @description 处理图片列表，根据图片的索引生成图片的行数和列数，其生成是行数和列数要满足排布方式，排布方式为：以每四张图片为“一组”，每组的总行数为2，列数为4，奇数组四张图片占据的行列数分别为：
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
        return {
            src: `${src}?w=${size * cols}&h=${size * rows}&fit=crop&auto=format`,
            srcSet: `${src}?w=${size * cols}&h=${size * rows}&fit=crop&auto=format&dpr=2 2x`,
        }
    }, [])


    /**
     * @description 组件加载完成后，设置图片列表的行列数
     */
    useLayoutEffect(() => {
        const updatedImageList = updateImagesRowsAndCols(imageList);
        setImageList(updatedImageList);
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
        setImageList(updatedImageList);
        if (selectedImage && selectedImage.src === item.src) {
            setSelectedImage(null);
            // resetImageTransform();
        }
    }
    /**
     * @description 清除图片列表，重置当前选中的图片和图片的放大和移动状态
     * 
     */
    const handleClearImages = () => {
        
    }

    return (
        <div className='Photo_container'>
            <div className="Photo_imageListContainer">
                <div className="Photo_imageListHeader">
                    {
                        buttonList.current.map((button, index) => (
                            <Tooltip key={index} title={button.tooltip}>
                                <button
                                    className='Photo_button'
                                    onClick={button.onClick}
                                >
                                    {button.icon}
                                </button>
                            </Tooltip>
                        ))
                    }
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
                            >
                                <img
                                    {...srcset(item.src, 121, item.rows, item.cols)}
                                    alt={item.title}
                                    loading="lazy"
                                />
                            </ImageListItem>
                        ))
                    }
                </ImageList>
            </div>
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