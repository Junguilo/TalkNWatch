"use client"
import { useState, useRef, useEffect } from 'react'
import styles from './ChatBox.module.css'

export default function ChatBox({ roomID, socket, onSendMessage }) {
  const [messages, setMessages] = useState([])
  const inputRef = useRef(null)
  
  useEffect(() => {
    if (!socket) return
    
    // Listen for incoming messages
    const handleIncomingMessage = (message) => {
      setMessages(prev => [...prev, message])
    }
    
    socket.on('sendMessage', handleIncomingMessage)
    
    return () => {
      socket.off('sendMessage', handleIncomingMessage)
    }
  }, [socket])
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputRef.current && inputRef.current.value.trim()) {
      onSendMessage(inputRef.current.value)
      inputRef.current.value = ''
    }
    return false
  }
  
  return (
    <div className="chat-container">
      <div className="message-list">
        {messages.map((msg, index) => (
          <div key={index} className="message">
            {msg}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          ref={inputRef} 
          placeholder="Type a message..." 
        />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}