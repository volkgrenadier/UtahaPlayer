import React, { useState, useCallback } from 'react'
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
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
    const srcset = useCallback((src, size, rows = 1, cols = 1) => {
        return {
            src: `${src}?w=${size * cols}&h=${size * rows}&fit=crop&auto=format`,
            srcSet: `${src}?w=${size * cols}&h=${size * rows}&fit=crop&auto=format&dpr=2 2x`,
        }
    }, [])
    return (
        <div className='Photo_container'>
            <ImageList
                sx={{ width: 1/3, height: 1 }}
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
                            onClick={() => setSelectedImage(item)}
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
            <div className="Photo_displayArea">
                {
                    selectedImage ? (
                        <img
                            src={selectedImage.src}
                            alt={selectedImage.title}
                            className="Photo_selectedImage"
                        />
                    ) : (
                        <div className="Photo_placeholder">请选择一张图片</div>
                    )
                }
            </div>
        </div>
    )
}

export default Photo