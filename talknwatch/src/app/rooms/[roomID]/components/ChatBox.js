"use client"
import { useState, useRef, useEffect } from 'react'
import styles from './ChatBox.module.css'
import Image from 'next/image'


export default function ChatBox({ roomID, socket, onSendMessage }) {
  const [messages, setMessages] = useState([])
  const inputRef = useRef(null)
  const messageListRef = useRef(null) // Add this ref for the message list
  const nameRef = useRef(null)


  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current?.scrollIntoView({behavior: "smooth"});
    }
  }

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
  
  
  // Add auto-scroll effect when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputRef.current && inputRef.current.value.trim()) {
      onSendMessage(inputRef.current.value)
      inputRef.current.value = ''
    }
    return false
  }
  
  // const showSettingsModal = () => {

  // };

  return (
    <div className={styles.chatRoomBody}>
        <div className={styles.title}>
          <div className={styles.chatTitle}>
              Chat
          </div>

          <div className={styles.userCount}>
              0
          </div>
        </div>

        <div className={styles.messageList}>
          {messages.map((msg, index) => (
            <div key={index} className="message">
              {msg}
            </div>
          ))}
          <div ref={messageListRef}/>
        </div>

        <div className={styles.sendMessage}>
          <form onSubmit={handleSubmit}>
            <input 
              type="text" 
              ref={inputRef} 
              placeholder="Type a message..." 
            />
            <button type="submit">Send</button>
        </form>
      </div>

      <div className={styles.footer}>
        <button className={styles.iconButton}>
          <Image 
            src="/Icons/settings-3110.svg"
            alt="Settings" 
            width={24}
            height={24}
          />
        </button>
      </div>

      <dialog>
          <form>
              <input
                type="text"
                ref={nameRef}
                placeholder="Enter Name Here..."
                />
                <button type="submit">Send</button>
                <button>Close</button>
          </form>
      </dialog>
    </div>
  )
}