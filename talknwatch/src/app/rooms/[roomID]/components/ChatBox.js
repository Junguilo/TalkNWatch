"use client"
import { useState, useRef, useEffect } from 'react'
import styles from './ChatBox.module.css'
import Image from 'next/image'


export default function ChatBox({ roomID, socket, onSendMessage, numPeople }) {
  const [messages, setMessages] = useState([])
  const inputRef = useRef(null)
  const messageListRef = useRef(null) // Add this ref for the message list
  const [numWatching, setNumWatching] = useState(0);
  
  //settings modal
  const nameRef = useRef(null)
  const dialogRef = useRef(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  //change the chat number to reflect how many people are in the room
  useEffect(()=>{
    console.log(`ChatBox: numPeople prop changed to ${numPeople}`);
    setNumWatching(numPeople);
  }, [numPeople]);

  //open/close dialog functions
  const openDialog = () => {
    dialogRef.current?.showModal()
    setIsDialogOpen(true)
  }

  // Fix the missing parameter in closeDialog
  const closeDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    dialogRef.current?.close();
    setIsDialogOpen(false);
  }
  
  const handleSettingsSubmit = (e) => {
    e.preventDefault()
    //saveName
    if(nameRef.current?.value){
      console.log("Name changed to:", nameRef.current.value)
      //send the name to the server later
    }
    closeDialog(e)
  }

  //chat Functions
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
  
  //listen for any new users that join the server
  useEffect(() => {
    if(!socket) return

    const handleNewUsers = (data) => {
        console.log('Room update in ChatBox:', data)
        setNumWatching(data.numClients)
    }

    socket.on('roomUpdate', handleNewUsers)
    
    return () => {
      socket.off('roomUpdate', handleNewUsers)
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

  return (
    <div className={styles.chatRoomBody}>
        <div className={styles.title}>
          <div className={styles.chatTitle}>
              Chat
          </div>

          <div className={styles.userCount} title="Number of people watching">
              {numWatching}
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
        <button 
          className={styles.iconButton}
          onClick={openDialog}
          >
          <Image 
            src="/Icons/settings-3110.svg"
            alt="Settings" 
            width={24}
            height={24}
          />
        </button>
      </div>

      <dialog ref={dialogRef} className={styles.modal}>
        <h3>Settings</h3>
        <form onSubmit={handleSettingsSubmit} className={styles.settingsForm} autoComplete="off">
          <div className={styles.formGroup}>
            <label htmlFor="username">Display Name:</label>
            <input
              id="username"
              type="text"
              ref={nameRef}
              placeholder="Enter your name..."
              autoComplete="off"
            />
          </div>
          
          <div className={styles.modalButtons}>
            <button type="submit" className={styles.primaryButton}>Save</button>
            <button 
              type="button" 
              onClick={closeDialog} 
              className={styles.secondaryButton}
            >
              Cancel
            </button>
          </div>
        </form>
      </dialog>

    </div>
  )
}