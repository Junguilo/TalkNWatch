"use client"
import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import styles from './VideoPlayer.module.css'

export default function VideoPlayer({ roomID, socket, setPlayer }) {
  const playerContainerRef = useRef(null)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const playerRef = useRef(null)
  
  // Add state for unmute modal
  const [showUnmuteModal, setShowUnmuteModal] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)
  
  //flags for client, so we don't get stuck in a feedback loop
  const ignoreNextPlayEvent = useRef(false)
  const ignoreNextPauseEvent = useRef(false)
  const ignoreNextSeekEvent = useRef(false)
  const ignoreChangeVideoEvent = useRef(false)

  // Handle scripts loaded
  const handleScriptsLoaded = () => {
    setScriptsLoaded(true)
  }
  
  // Handle unmute button click
  const handleUnmuteClick = () => {
    setShowUnmuteModal(false)
    setHasInteracted(true)
    
    // If the player is already initialized, unmute it
    if (playerRef.current) {
      playerRef.current.muted(false)
      playerRef.current.volume(1)
    }
  }

  // Initialize player when component mounts and scripts are loaded
  useEffect(() => {
    // Wait for scripts to load
    if (!scriptsLoaded || typeof window === 'undefined' || !window.videojs) return;
    
    let player;
    
    const initializePlayer = () => {
      // Create <video> element
      const tag = document.createElement('video')
      tag.id = 'myVideo'
      tag.className = 'video-js vjs-default-skin vjs-big-play-centered'
      tag.setAttribute('controls', true)
      tag.setAttribute('width', '100%')
      tag.setAttribute('height', '100%')
      tag.setAttribute('muted', !hasInteracted) // Start muted if user hasn't interacted yet
      
      // Add to DOM
      if (playerContainerRef.current) {
        // Clear any existing content
        playerContainerRef.current.innerHTML = ''
        playerContainerRef.current.appendChild(tag)
        
        try {
          // Initialize Video.js with enhanced options
          player = window.videojs('myVideo', {
            techOrder: ['youtube'],
            sources: [{
              type: 'video/youtube',
              src: 'https://www.youtube.com/watch?v=M7lc1UVf-VE'
            }],
            youtube: {
              modestbranding: 1,
              rel: 0,
              playerVars: {
                autoplay: hasInteracted ? 1 : 0, // Only autoplay if user has interacted
                mute: hasInteracted ? 0 : 1,     // Start muted if no interaction
              }
            },
            fill: true,           // Fill parent container
            responsive: true,
            aspectRatio: '16:9',  // Maintain aspect ratio
            fluid: true,          // Make the player scalable
            //playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2]  // Add playback speed controls
          })
          
          console.log('Video.js player initialized')
          
          // Store player instance
          playerRef.current = player
          setPlayer(player)
          setPlayerReady(true)
          
          // Setup player event listeners for outgoing events
          setupPlayerEvents(player, socket, roomID, ignoreNextPlayEvent, ignoreNextPauseEvent)
          
          return player;
        } catch (error) {
          console.error('Error initializing player:', error)
        }
      }
      return null;
    }
    
    // Initialize the player
    player = initializePlayer();
    
    // Setup socket handlers if we have both socket and player
    if (socket && player) {
      console.log('Setting up socket event handlers for incoming events')
    }
    
    // Handler for video change events from other users
    const handleVideoChange = (videoLink) => {
      console.log('Received changeBroadcastVideo event with link:', videoLink)
      
      try {
        // Change the video source
        player.src({
          type: 'video/youtube',
          src: videoLink
        })
        
        // Load and play
        player.load()
        
        // Set flag before programmatic play to avoid re-emitting
        ignoreNextPlayEvent.current = true
        console.log('Set ignoreNextPlayEvent to true before video change play')
        
        // Play the video
        player.play().catch(e => console.error('Error playing after video change:', e))
      } catch (error) {
        console.error('Error handling video change:', error)
      }
    }
    
    // Handler for play events from other users
    const handlePlay = (data) => {
      console.log('Received changeBroadcastPlay event with time:', data.time)
      
      // Set the flag to prevent re-emitting
      ignoreNextPlayEvent.current = true
      console.log('Set ignoreNextPlayEvent to true before remote play')
      
      // Seek to the time and play
      player.currentTime(data.time)
      player.play().catch(e => {
        console.error('Error playing video after remote play event:', e)
        // Reset flag if play fails
        ignoreNextPlayEvent.current = false
      })
    }
    
    // Handler for pause events from other users
    const handlePause = (data) => {
      console.log('Received changeBroadcastPause event with time:', data.time)
      
      // Set the flag to prevent re-emitting
      ignoreNextPauseEvent.current = true
      console.log('Set ignoreNextPauseEvent to true before remote pause')
      
      // Seek to the time and pause
      player.currentTime(data.time)
      player.pause()
    }
    
    //Handler for seek events from other users
    const handleSeek = (time) => {
      console.log('Received changeBroadcastSeek event with time:', time)
      
      //Set the flag to prevent re-emitting
      ignoreNextSeekEvent.current = true
      console.log('Set ignoreNextSeekEvent to true before remote seek')
      
      //Seek to the time
      player.currentTime(time)
    }
    
    // Register socket event handlers
    socket.on('changeBroadcastVideo', handleVideoChange)
    socket.on('changeBroadcastPlay', handlePlay)
    socket.on('changeBroadcastPause', handlePause)
    socket.on('changeBroadcastSeek', handleSeek)
    
    // Cleanup function to remove handlers when component unmounts
    return () => {
      if (socket) {
        socket.off('changeBroadcastVideo', handleVideoChange)
        socket.off('changeBroadcastPlay', handlePlay)
        socket.off('changeBroadcastPause', handlePause)
        socket.off('changeBroadcastSeek', handleSeek)
      }
      
      if (player) {
        player.dispose()
        playerRef.current = null
      }
    }
  }, [socket, playerReady])

  //Setup outgoing event handlers (user interacts with player)
 
  function setupPlayerEvents(player, socket, roomID, ignorePlayFlag, ignorePauseFlag) {
    if (!player || !socket) return
    
    player.ready(() => {
      console.log('Player is ready, setting up outgoing event handlers')
      
      // When user clicks play
      player.on('play', () => {
        // Use the shared flag ref
        if (ignorePlayFlag.current) {
          console.log('Ignoring play event (programmatic)')
          ignorePlayFlag.current = false
          return
        }
        
        console.log('User initiated play, emitting to room')
        socket.emit('play', {
          room: roomID,
          time: player.currentTime(),
          message: 'Video played'
        })
      })
      
      // When user clicks pause
      player.on('pause', () => {
        // Use the shared flag ref
        if (ignorePauseFlag.current) {
          console.log('Ignoring pause event (programmatic)')
          ignorePauseFlag.current = false
          return
        }
        
        console.log('User initiated pause, emitting to room')
        socket.emit('pause', {
          room: roomID,
          time: player.currentTime(),
          message: 'Video paused'
        })
      })
      
      // Add seek handler for better synchronization
      let lastSeekTime = 0;
      player.on('seeking', () => {
        if (ignoreNextSeekEvent.current) {
          console.log('Ignoring seek event (programmatic)')
          ignoreNextSeekEvent.current = false
          return
        }
        
        const currentTime = player.currentTime();
        
        // Only emit seek events for significant jumps to reduce network traffic
        if (Math.abs(currentTime - lastSeekTime) > 3) {
          console.log('User initiated seek, emitting to room')
          socket.emit('seek', {
            room: roomID,
            time: currentTime,
            message: 'Video seeked'
          })
          lastSeekTime = currentTime
        }
      })
    })
  }

  // Function to change video - can be called from a form or elsewhere
  const changeVideoInternal = (videoUrl) => {
    if (!playerRef.current) return
    
    try {
      // Extract video ID for better compatibility with YouTube links
      let videoId = videoUrl;
      
      // Handle various YouTube URL formats
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const urlObj = new URL(videoUrl);
        
        if (videoUrl.includes('youtube.com')) {
          videoId = urlObj.searchParams.get('v');
        } else if (videoUrl.includes('youtu.be')) {
          videoId = urlObj.pathname.substring(1);
        }
        
        // If we couldn't extract the ID, use the original URL
        if (!videoId) videoId = videoUrl;
      }
      
      playerRef.current.src({
        type: 'video/youtube',
        src: videoId.startsWith('http') ? videoId : `https://www.youtube.com/watch?v=${videoId}`
      })
      
      playerRef.current.load()
      
      // Set the flag before playing to prevent feedback loop
      ignoreNextPlayEvent.current = true
      console.log('Set ignoreNextPlayEvent to true before internal video change play')
      
      // Handle play errors more gracefully
      playerRef.current.play()
        .catch(error => {
          console.error('Error playing video after change:', error)
          // Reset flag if play fails
          ignoreNextPlayEvent.current = false
          // Show error to user
          const errorOverlay = document.createElement('div');
          errorOverlay.innerHTML = `<p>Error playing video. Autoplay may be blocked by your browser.</p>`;
          errorOverlay.style = 'position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px;';
          playerContainerRef.current.appendChild(errorOverlay);
          
          // Remove error after 5 seconds
          setTimeout(() => {
            errorOverlay.remove();
          }, 5000);
        });
    } catch (error) {
      console.error('Error changing video:', error)
    }
  }

  return (
    <div className={styles.playerContainer}>
      <div className={styles.videoWrapper} id="player-container" ref={playerContainerRef}></div>
      
      {/* Unmute Modal */}
      {showUnmuteModal && (
        <div className={styles.unmuteModal}>
          <h2>Enable Audio for TalkNWatch</h2>
          <p>
            To enjoy synchronized video watching with your friends, we need your permission to play audio.
            Click the button below to enable audio and allow videos to autoplay when others start playback.
          </p>
          <button className={styles.unmuteButton} onClick={handleUnmuteClick}>
            <span className={styles.iconWrapper}>🔊</span>
            Enable Audio
          </button>
        </div>
      )}
      
      {/* Load video.js dependencies */}
      <Script 
        src="https://vjs.zencdn.net/7.20.3/video.min.js" 
        strategy="beforeInteractive" 
        onLoad={() => console.log('Video.js loaded')}
      />
      <Script 
        src="https://cdn.jsdelivr.net/npm/videojs-youtube/dist/Youtube.min.js" 
        strategy="afterInteractive"
        onLoad={handleScriptsLoaded}
      />
      
      {/* Add the CSS */}
      <link href="https://unpkg.com/video.js@7/dist/video-js.min.css" rel="stylesheet" />
    </div>
  )
}