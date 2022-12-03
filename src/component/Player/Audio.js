import React,{ useRef, useState, useLayoutEffect } from 'react'
import { useSelector, useDispatch} from 'react-redux'
import { changeVolume, changeMusic } from '../store/userConfigSlice'
import styles from './audio.module.scss'

import myMusic from '../../cache/1.mp3'
const Audio = () => {

    const audioRef = useRef();      //  audio
    const volumeSlider = useRef();  //  slider
    const progressBar = useRef()    //  progressBar
    const volumeSliderContainer = useRef();    //  音量面板
    const [playStatus, setPlayStatus] = useState(false) //  播放状态
    const [volumeStatusBackUp, setVolumeStatusBackUp] = useState(0) //  音量状态备份，用于快速静音时恢复音量
    const userConfig = useSelector(state => state.userConfig)   //  获取用户设置参数
    const dispatch = useDispatch()
    
    let playTimeInterval = null;        //  播放时更新进度条的计时器
    let testMusicId = "utahaId"    //  测试用音乐id

    function testMusic(params) {    //  测试用加载音频
        audioRef.current.src = myMusic
    }


    useLayoutEffect(() => {
        testMusic()


        //  根据用户个人数据改变播放器参数(恢复上一次状态)
        volumeSlider.current.value = userConfig.volume; 
        volumeSlider.current.style.background = `linear-gradient(to right, orange 0%, red ${userConfig.volume}%, rgba(128,128,128,0.5) ${userConfig.volume}%, rgba(128,128,128,0.5) 100%)`
        audioRef.current.volume = userConfig.volume/100;    //  改变播放器音量

        //  恢复上一次播放时间
        audioRef.current.currentTime = userConfig.lastCurrentTime
        let lastMusicPlayRate = userConfig.lastCurrentTime / userConfig.lastMusicDuration   //  上次播放结束时已播放进度
        progressBar.current.value = lastMusicPlayRate * 1000
        // console.log(userConfig.lastCurrentTime , userConfig.lastMusicDuration )
        progressBar.current.style.background = `linear-gradient(to right, orange 0%, red ${lastMusicPlayRate * 100}%, rgba(128,128,128,0.5) ${lastMusicPlayRate * 100}%, rgba(128,128,128,0.5) 100%)`
        
        
        
        if (userConfig.volume !== 0) {  //  如果用户上一次是静音退出的，那么默认将快速静音的恢复值设为50
            setVolumeStatusBackUp(userConfig.volume)
        } else {
            setVolumeStatusBackUp(50)
        }
        
        console.log(userConfig)
    },[])
    
    const changeMusicParams = (dataObj) => { 
        dispatch(changeMusic({
                lastMusicId: dataObj.lastMusicId,
                lastCurrentTime: dataObj.lastCurrentTime,
                lastMusicDuration: dataObj.lastMusicDuration
            })
        )
    }
    // 切换播放状态
    const play = () => {
        if (audioRef.current.paused) {
            console.log(audioRef)
            if (audioRef !==null && playTimeInterval === null) {
                playTimeInterval = setInterval(() => {  //  updateProgressBar
                    let now = audioRef.current.currentTime / audioRef.current.duration
                    progressBar.current.value =  now * 1000
                    progressBar.current.style.background = `linear-gradient(to right, orange 0%, red ${now*100}%, rgba(128,128,128,0.5) ${now*100}%, rgba(128,128,128,0.5) 100%)`
                    changeMusicParams({
                        lastMusicId: testMusicId,
                        lastCurrentTime: audioRef.current.currentTime,
                        lastMusicDuration: audioRef.current.duration
                    })
                }, 1000)
            }
            audioRef.current.play()
        }
        else{
            clearInterval(playTimeInterval)
            playTimeInterval = null;
            audioRef.current.pause();
            changeMusicParams({
                lastMusicId: testMusicId,
                lastCurrentTime: audioRef.current.currentTime,
                lastMusicDuration: audioRef.current.duration
            })
        }
        setPlayStatus(!playStatus)
        // console.log(audioRef)
        console.log(audioRef.current.duration)
        console.log(audioRef.current.currentTime)
    }
    //  改变音量状态
    const changeVolumeIconState= (value) => {
        // console.log(value)
        let statusFlag = 0
        if (value === 0) {
            statusFlag = 0
        }
        else if (value <= 20) {
            statusFlag = 1
        }
        else if (value <= 60) {
            statusFlag = 2
        }
        else{
            statusFlag = 3
        }
        dispatch(changeVolume({
            volumeStatus: statusFlag,
            volume: value
        }))
    }
    const dotMove= (e) => {
        // 随拖动 改变音量条颜色和音量图标
        e.target.style.background = `linear-gradient(to right, orange 0%, red ${e.target.value}%, rgba(128,128,128,0.5) ${e.target.value}%, rgba(128,128,128,0.5) 100%)`
        changeVolumeIconState(e.target.value)
        if (e.target.value !== 0) {
            setVolumeStatusBackUp(e.target.value)
        }
        //  改变音量
        audioRef.current.volume = e.target.value/100;
        // console.log("value",e.target.value,audioRef.current.volume)
    }
    const fastMute = () => {
        //  快速静音与恢复
        if (volumeSlider.current.value !== "0") {
            //  改变音量图标与滑动条背景
            volumeSlider.current.value = 0
            volumeSlider.current.style.background = `linear-gradient(to right, orange 0%, red ${0}%, rgba(128,128,128,0.5) ${0}%, rgba(128,128,128,0.5) 100%)`
            changeVolumeIconState(0)
            //  改变音量
            audioRef.current.volume = 0;
        }
        else{
            //  改变音量图标与滑动条背景
            volumeSlider.current.value = volumeStatusBackUp;
            volumeSlider.current.style.background = `linear-gradient(to right, orange 0%, red ${volumeStatusBackUp}%, rgba(128,128,128,0.5) ${volumeStatusBackUp}%, rgba(128,128,128,0.5) 100%)`
            changeVolumeIconState(volumeStatusBackUp)
            //  改变音量
            audioRef.current.volume = volumeStatusBackUp / 100;
        }
    }
    const changePlayTime = (e) => {     //  拖动/点击进度条改变当前播放时间
        // console.log(e.target.value)
        let now = e.target.value / 1000 * audioRef.current.duration
        audioRef.current.currentTime = now
        progressBar.current.style.background = `linear-gradient(to right, orange 0%, red ${e.target.value/10}%, rgba(128,128,128,0.5) ${e.target.value/10}%, rgba(128,128,128,0.5) 100%)`
        changeMusicParams({
            lastMusicId: testMusicId,
            lastCurrentTime: now,
            lastMusicDuration: audioRef.current.duration
        })
    }

    return (
        <div className={styles.audio_container}>
            <audio id='audio_audio' ref={audioRef} type="audio/mpeg">
            </audio>
            <div className={styles.audio_progressBar_container}>
                <input type="range" min={0} max={1000} className={styles.audio_progressBar} ref={progressBar} onInput={e => {changePlayTime(e)}}/>
            </div>
            <div className={styles.audio_button_container}>
                <button className={styles.audio_button} id={styles.audio_button_piror} title='上一首'></button>
                <button className={styles.audio_button} id={playStatus ? styles.audio_button_pause : styles.audio_button_play} onClick={play} title={playStatus? '暂停' : '开始'}></button>
                <button className={styles.audio_button} id={styles.audio_button_next} title='下一首'></button>
            </div>
            <div className={styles.audio_controlPannel_container}>
                <button className={`${styles.audio_controlPannel_button} 
                ${
                    userConfig.volumeStatus < 1 
                    ? styles.audio_controlPannel_button_volume_mute
                    : userConfig.volumeStatus < 2 
                    ? styles.audio_controlPannel_button_volume_low 
                    : userConfig.volumeStatus < 3 
                    ? styles.audio_controlPannel_button_volume_middle 
                    : styles.audio_controlPannel_button_volume_high
                }`} id={styles.audio_controlPannel_button_volume} title='音量' onClick={fastMute}></button>
                <button className={styles.audio_controlPannel_button} id={styles.audio_controlPannel_sequence} title='播放列表'></button>
                <div className={styles.audio_controlPannel_volumeSlider_container}>
                    <div className={styles.audio_controlPannel_volumeSlider_Triangle}></div>
                    <div className={styles.audio_controlPannel_volumeSlider_slider_inner_container} ref={volumeSliderContainer}>
                        <input className={styles.audio_controlPannel_volumeSlider_slider_input} type="range" min={0} max={100} defaultValue={10} onChange={e => {dotMove(e)}} ref={volumeSlider}/>
                    </div>
                    
                </div>
            </div>
        </div>
    )
}

export default Audio