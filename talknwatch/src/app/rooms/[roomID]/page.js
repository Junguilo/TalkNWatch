"use client" //this shouldnt be here
import { useParams } from 'next/navigation'

export default function BlogPost() {
  const params = useParams()
  const slug = params.roomID
  return <div>Post: {slug}</div>
}