"use client"
import { useParams } from 'next/navigation'
import { useRef } from 'react'
import VideoPlayer from './components/VideoPlayer'
import VideoForm from './components/VideoForm'
import ChatBox from './components/ChatBox'
import useSocketSetup from './hooks/useSocketSetup'

export default function RoomPage() {
  const params = useParams()
  const roomID = params.roomID
  
  // Setup socket connection and get shared state/functions
  const { 
    socket, 
    player,
    changeVideo,
    sendMessage,
    syncTime
  } = useSocketSetup(roomID)

  return (
    <div className="room-container">
      <h1>Room: {roomID}</h1>
      
      <VideoForm onSubmit={changeVideo} />
      
      <VideoPlayer 
        roomID={roomID} 
        socket={socket} 
        setPlayer={player.setPlayer} 
      />
      
      <ChatBox 
        roomID={roomID}
        socket={socket}
        onSendMessage={sendMessage}
      />
    </div>
  );
}

/*
    <div>
      <form name="videoChange" onsubmit="return changeVideoEvent()" method="get">
        Video: <input type="text" name="videoName">
        <input type="submit" value="Submit">
      </form>
      <div id="player"></div>

      <button onClick="getCurrTime()"> Sync Time </button>

      <div id="textChat">
        <div>
            <form name="messageSubmit" onsubmit="return broadcastMessage()" method="get">
              <input type="text" name="messageText">
              <input type="submit" value="Submit">
            </form>
        </div>
      </div>

      <script src="https://vjs.zencdn.net/7.20.3/video.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/videojs-youtube/dist/Youtube.min.js"></script>

      <link href="https://unpkg.com/video.js@7/dist/video-js.min.css" rel="stylesheet">

      <script src = "/client.js"></script>
    </div>
*/