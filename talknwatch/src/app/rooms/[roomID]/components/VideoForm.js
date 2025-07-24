"use client"
import { useRef } from 'react'

export default function VideoForm({ onSubmit }) {
  const inputRef = useRef(null)
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputRef.current) {
      onSubmit(inputRef.current.value)
      inputRef.current.value = ''
    }
    return false
  }
  
  return (
    <form onSubmit={handleSubmit} className="video-form">
      <label>
        Video URL: 
        <input type="text" ref={inputRef} placeholder="YouTube URL" />
      </label>
      <button type="submit">Change Video</button>
    </form>
  )
}