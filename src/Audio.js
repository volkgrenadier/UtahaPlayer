import React,{ useRef, useState, useEffect} from 'react'
import styles from './audio.module.scss'
import userConfigLocal from './config/user.json'    //  读取用户个人数据
const Audio = () => {
    let userConfig = userConfigLocal.user;
    const audioRef = useRef();      //  audio
    const volumeSlider = useRef();  //  slider
    const volumeSliderContainer = useRef();    //  音量面板
    const [playStatus, setPlayStatus] = useState(false) //  播放状态
    const [volumeStatus, setVolumeStatus] = useState(0) //  音量状态，用于控制音量图标
    const [volumeStatusBackUp, setVolumeStatusBackUp] = useState(0) //  音量状态备份，用于快速静音时恢复音量

    useEffect(() => {
        //  根据用户个人数据改变播放器参数(恢复上一次状态)
        volumeSlider.current.value = userConfig.volume; 
        volumeSlider.current.style.background = `linear-gradient(to right, orange 0%, red ${userConfig.volume}%, rgba(128,128,128,0.5) ${userConfig.volume}%, rgba(128,128,128,0.5) 100%)`
        audioRef.current.volume = userConfig.volume/100;    //  改变播放器音量
        setVolumeStatus(changeVolumeIconState(userConfig.volume))
        setVolumeStatusBackUp(userConfig.volume)
        console.log(userConfig)
    },[])
    // 切换播放状态
    const play = () => {
        if (audioRef.paused) {
            audioRef.current.play()
        }
        else{
            audioRef.current.pause();
        }
        setPlayStatus(!playStatus)
        console.log(audioRef)
        console.log(audioRef.current.duration)
        console.log(audioRef.current.currentTime)
    }
    //  改变音量状态
    const changeVolumeIconState= (value) => {
        if (value <= 0) {
            setVolumeStatus(0)
        }
        else if (value <= 20) {
            setVolumeStatus(1)
        }
        else if (value <= 50) {
            setVolumeStatus(2)
        }
        else{
            setVolumeStatus(3)
        }
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
        console.log("value",e.target.value,audioRef.current.volume)
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


    return (
        <div className={styles.audio_container}>
            <audio id='audio_audio' ref={audioRef}></audio>
            <div className={styles.audio_button_container}>
                <button className={styles.audio_button} id={styles.audio_button_piror} title='上一首'></button>
                <button className={styles.audio_button} id={playStatus ? styles.audio_button_pause : styles.audio_button_play} onClick={play} title={playStatus? '暂停' : '开始'}></button>
                <button className={styles.audio_button} id={styles.audio_button_next} title='下一首'></button>
            </div>
            <div className={styles.audio_controlPannel_container}>
                <button className={`${styles.audio_controlPannel_button} 
                ${
                    volumeStatus < 1 
                    ? styles.audio_controlPannel_button_volume_mute
                    : volumeStatus < 2 
                    ? styles.audio_controlPannel_button_volume_low 
                    : volumeStatus < 3 
                    ? styles.audio_controlPannel_button_volume_middle 
                    : styles.audio_controlPannel_button_volume_high
                }`} id={styles.audio_controlPannel_button_volume} title='音量' onClick={fastMute}></button>
                <button className={styles.audio_controlPannel_button} id={styles.audio_controlPannel_sequence} title='播放列表'></button>
                <div className={styles.audio_controlPannel_volumeSlider_container}>
                    <div className={styles.audio_controlPannel_volumeSlider_Triangle}></div>
                    <div className={styles.audio_controlPannel_volumeSlider_slider_inner_container} ref={volumeSliderContainer}>
                        <input className={styles.audio_controlPannel_volumeSlider_slider_input} type="range" min={0} max={100} defaultValue={10} onChange={e=> {dotMove(e)}} ref={volumeSlider}/>
                    </div>
                    
                </div>
            </div>
        </div>
    )
}

export default Audio