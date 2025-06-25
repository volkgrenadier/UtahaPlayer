import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import "./VideoPlayer.scss";
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import AlbumIcon from '@mui/icons-material/Album';
import MovieIcon from '@mui/icons-material/Movie';
import defaultCoverImg from '../../assets/1.jpg';

const VideoPlayer = () => {

	// 当前播放视频
	const [currentVideo, setCurrentVideo] = useState(null);

	return (
		<div className='VideoPlayer_container'>
			<div className="VideoPlayer_diaplay_container">
				aaa1
			</div>
			<div className='VideoPlayer_controller_outer_container'>
				
				<div className="VideoPlayer_info_container">
					{/* 播放区域信息设置 */}
					<div className="VideoPlayer_info_cover_container">
						<img src={currentVideo?.coverUrl || defaultCoverImg} alt="封面" />
					</div>
				</div>
				<div className="VideoPlayer_controller_container">
					2222
					<div className="VideoPlayer_controller_buttons">
						<button><SkipPreviousIcon /></button>
						<button></button>
						<button><SkipNextIcon /></button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default VideoPlayer