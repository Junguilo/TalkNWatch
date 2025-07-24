'use server'

import { v4 as uuidv4 } from 'uuid'
import { redirect } from 'next/navigation'


export async function createRoom() {
  const roomId = uuidv4()
  // You could store room data in a database here if needed
  
  // Return the room ID instead of redirecting
  return { roomId }
}