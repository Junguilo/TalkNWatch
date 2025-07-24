"use client"
import { useState, useEffect, useCallback } from 'react'

export default function useSocketSetup(roomID) {
  const [socket, setSocket] = useState(null)
  const [playerInstance, setPlayerInstance] = useState(null)

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
  
  return {
    socket,
    player: {
      instance: playerInstance,
      setPlayer: setPlayerInstance
    },
    changeVideo,
    sendMessage,
    syncTime
  }
}