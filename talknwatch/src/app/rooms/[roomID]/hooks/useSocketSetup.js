"use client"
import { useState, useEffect, useCallback } from 'react'

export default function useSocketSetup(roomID) {
  const [socket, setSocket] = useState(null)
  const [playerInstance, setPlayerInstance] = useState(null)
  const [numUsersInRoom, setNumUsersInRoom] = useState(1)  // Start with 1 (self)

  // Connect to socket.io when component mounts
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Load socket.io script
    const loadSocketIO = async () => {
      if (window.io) return window.io
      
      return new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = "https://cdn.socket.io/4.7.4/socket.io.min.js"
        script.onload = () => resolve(window.io)
        document.head.appendChild(script)
      })
    }
    
    // Initialize socket
    loadSocketIO().then(io => {
      console.log("Socket.IO script loaded successfully")
      const socketHost = window.location.hostname === 'localhost' 
        ? 'http://localhost:8080' 
        : window.location.origin
      
      console.log(`Connecting to socket server at: ${socketHost}`)
      const socketInstance = io(socketHost, {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket', 'polling']
      })
      
      // Setup basic socket events
      socketInstance.on('connect', () => {
        console.log('Connected to socket server with ID:', socketInstance.id)
        socketInstance.emit('join-room', roomID)
      })
      
      // Listen for room updates (user count)
      socketInstance.on('roomUpdate', (data) => {
        console.log('Room update received:', data);
        console.log(`Updating user count to ${data.numClients}`);
        setNumUsersInRoom(data.numClients);
      })
      
      // Store socket instance
      setSocket(socketInstance)
      
      // Cleanup
      return () => {
        socketInstance.disconnect()
      }
    })
  }, [roomID])
  
  // Public API functions
  const changeVideo = useCallback((videoUrl) => {
    if (!socket || !playerInstance) return
    
    // Emit event to server
    socket.emit('changeVideo', {
      room: roomID,
      link: videoUrl
    })
    
    // Change our local video
    playerInstance.src({
      type: 'video/youtube',
      src: videoUrl
    })
    
    playerInstance.load()
    playerInstance.play()
  }, [socket, roomID, playerInstance])
  
  const sendMessage = useCallback((message) => {
    if (!socket) return
    
    socket.emit('sendMessage', {
      room: roomID,
      msg: message
    })
  }, [socket, roomID])
  
  const syncTime = useCallback(() => {
    if (!socket || !playerInstance) return
    
    const time = playerInstance.currentTime()
    socket.emit('timeUpdate', {
      room: roomID,
      time: time
    })
  }, [socket, playerInstance, roomID])

  // In your useSocketSetup.js
  useEffect(() => {
      if (!socket) return;
      
      // Handle initial room state when joining
      socket.on('roomState', (state) => {
          console.log('Received room state:', state);
          
          if (playerInstance && state.videoUrl) {
              // Set the video
              playerInstance.src({
                  type: 'video/youtube',
                  src: state.videoUrl
              });
              
              // Seek to the correct position
              // Add time elapsed since last update if the video was playing
              let adjustedTime = state.timestamp;
              if (state.isPlaying) {
                  const secondsElapsed = (Date.now() - state.lastUpdate) / 1000;
                  adjustedTime += secondsElapsed;
              }
              
              playerInstance.currentTime(adjustedTime);
              
              // Play if it was playing
              if (state.isPlaying) {
                  playerInstance.play();
              }
          }
      });
      
      // Send heartbeats while playing
      const heartbeatInterval = setInterval(() => {
          if (socket && playerInstance && !playerInstance.paused()) {
              socket.emit('heartbeat', {
                  room: roomID,
                  time: playerInstance.currentTime()
              });
          }
      }, 5000); // Every 5 seconds
      
      return () => {
          clearInterval(heartbeatInterval);
          socket.off('roomState');
      };
  }, [socket, playerInstance, roomID]);

  return {
    socket,
    player: {
      instance: playerInstance,
      setPlayer: setPlayerInstance
    },
    changeVideo,
    sendMessage,
    syncTime,
    numUsersInRoom
  }
}