"use client"

import { createRoom } from '../actions'
import styles from './hostRoom.module.css'

export default function HostRoom() {
  const handleSubmit = async (formData) => {
    const { roomId } = await createRoom(formData)
    
    // Do a full page refresh navigation
    window.location.href = `/rooms/${roomId}`
  }

  return(
    <div className={styles.hostRoomBody}>
        <h1>🎥TalkNWatch</h1>
        <h3>Watch Party</h3>
        <p>Watch Youtube Videos and hang out with friends!</p>
        <form action={handleSubmit}>
            <button type="submit">Host Room</button>
        </form>
    </div>
  )
}