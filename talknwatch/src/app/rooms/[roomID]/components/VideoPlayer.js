"use client"
import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

export default function VideoPlayer({ roomID, socket, setPlayer }) {
  const playerContainerRef = useRef(null)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const playerRef = useRef(null)
  
  // IMPORTANT: Define flags at component level using refs so they're accessible
  // to both incoming and outgoing event handlers
  const ignoreNextPlayEvent = useRef(false)
  const ignoreNextPauseEvent = useRef(false)
  const ignoreNextSeekEvent = useRef(false)
  const ignoreChangeVideoEvent = useRef(false)

  // Handle scripts loaded
  const handleScriptsLoaded = () => {
    setScriptsLoaded(true)
  }

  // Initialize player when component mounts and scripts are loaded
  useEffect(() => {
    if (!scriptsLoaded || typeof window === 'undefined' || !window.videojs) return;

    // Create <video> element
    const tag = document.createElement('video')
    tag.id = 'myVideo'
    tag.className = 'video-js vjs-default-skin'
    tag.setAttribute('controls', true)
    tag.setAttribute('width', 640)
    tag.setAttribute('height', 360)

    // Add to DOM
    if (playerContainerRef.current) {
      // Clear any existing content
      playerContainerRef.current.innerHTML = ''
      playerContainerRef.current.appendChild(tag)
    
      try {
        // Initialize Video.js
        const player = window.videojs('myVideo', {
          techOrder: ['youtube'],
          sources: [{
            type: 'video/youtube',
            src: 'https://www.youtube.com/watch?v=M7lc1UVf-VE'
          }],
          youtube: {
            modestbranding: 1,
            rel: 0
          }
        })
        
        console.log('Video.js player initialized')
        
        // Store player instance
        playerRef.current = player
        setPlayer(player)
        setPlayerReady(true)
        
        // Setup player event listeners for outgoing events
        // Pass the shared flag refs to both handler setups
        setupPlayerEvents(player, socket, roomID, ignoreNextPlayEvent, ignoreNextPauseEvent)
        
        // Cleanup on unmount
        return () => {
          if (player) {
            console.log('Disposing player')
            player.dispose()
          }
        }
      } catch (error) {
        console.error('Error initializing player:', error)
      }
    }
  }, [roomID, socket, setPlayer, scriptsLoaded])

  // Set up socket listeners for incoming events ONLY WHEN we have both socket and player
  useEffect(() => {
    if (!socket || !playerReady || !playerRef.current) {
      console.log('Not setting up socket handlers yet - waiting for prerequisites')
      return
    }
    
    console.log('Setting up socket event handlers for incoming events')
    const player = playerRef.current
    
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
    
    // Handler for seek events from other users
    const handleSeek = (time) => {
      console.log('Received changeBroadcastSeek event with time:', time)
      
      // Set the flag to prevent re-emitting
      ignoreNextSeekEvent.current = true
      console.log('Set ignoreNextSeekEvent to true before remote seek')
      
      // Seek to the time
      player.currentTime(time)
    }
    
    // Register socket event handlers
    socket.on('changeBroadcastVideo', handleVideoChange)
    socket.on('changeBroadcastPlay', handlePlay)
    socket.on('changeBroadcastPause', handlePause)
    socket.on('changeBroadcastSeek', handleSeek)
    
    // Cleanup function to remove handlers when component unmounts
    return () => {
      socket.off('changeBroadcastVideo', handleVideoChange)
      socket.off('changeBroadcastPlay', handlePlay)
      socket.off('changeBroadcastPause', handlePause)
      socket.off('changeBroadcastSeek', handleSeek)
    }
  }, [socket, playerReady])

  // Setup outgoing event handlers (when local user interacts with player)
  // IMPORTANT: Accept the shared flag refs as parameters
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
      
      // You can add more events here (seek, volume change, etc.)
    })
  }

  // Function to change video - can be called from a form or elsewhere
  const changeVideoInternal = (videoUrl) => {
    if (!playerRef.current) return
    
    try {
      playerRef.current.src({
        type: 'video/youtube',
        src: videoUrl
      })
      
      playerRef.current.load()
      
      // Set the flag before playing to prevent feedback loop
      ignoreNextPlayEvent.current = true
      console.log('Set ignoreNextPlayEvent to true before internal video change play')
      
      playerRef.current.play()
    } catch (error) {
      console.error('Error changing video:', error)
    }
  }

  return (
    <div>
      <div id="player-container" ref={playerContainerRef}></div>
      
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