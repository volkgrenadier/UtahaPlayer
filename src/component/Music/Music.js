import React from 'react';
import "./Music.scss";
import MusicPlayer from '../MusicPlayer/MusicPlayer';

const Music = () => {
	return (
		<div className='Music_container'>
			{/* 播放器组件  */}
			<MusicPlayer/>
		</div>
	)
}

export default Music