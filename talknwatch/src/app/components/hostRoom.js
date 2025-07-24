"use client"

import { createRoom } from '../actions'

export default function HostRoom() {
  const handleSubmit = async (formData) => {
    const { roomId } = await createRoom(formData)
    
    // Do a full page refresh navigation
    window.location.href = `/rooms/${roomId}`
  }

  return(
    <div>
      <form action={handleSubmit}>
        <button type="submit">Host Room</button>
      </form>
    </div>
  )
}