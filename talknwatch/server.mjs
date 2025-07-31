import { createServer } from 'http';
import { Server } from 'socket.io';
import { parse } from 'url';
import next from 'next';
import { v4 as uuidv4 } from 'uuid';

// Initialize Next.js
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: '.' });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

// Track room data
const socketRooms = new Map(); // socketId -> Set of roomIds
const roomStates = new Map(); // roomId -> {videoUrl, timestamp, lastUpdate}

// Wait for Next.js to be ready
app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.IO with CORS enabled
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ["https://talknwatch-react.onrender.com", "https://*.onrender.com"]
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log("New client connected", socket.id);
    
    //Join a hosted room
    socket.on('join-room', (roomId) => {
      console.log(`Socket ${socket.id} joining room: ${roomId}`);
      // Join the socket.io room
      socket.join(roomId);
      
      // Track this room for the socket
      if (!socketRooms.has(socket.id)) {
        socketRooms.set(socket.id, new Set());
      }
      socketRooms.get(socket.id).add(roomId);
      
      // Notify others in the room
      socket.to(roomId).emit('sendMessage', `A new user has joined the room.`);
      
      // Update everyone with new user count
      const numClients = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      console.log(`Room ${roomId} now has ${numClients} clients`);
      io.to(roomId).emit('roomUpdate', {roomId, numClients});

      //send roomState to joining user
      const roomState = roomStates.get(roomId);
      if(roomState){
        console.log(`Sending room state to new user ${socket.id}:`, roomState);
        socket.emit('roomState', roomState);
      } else {
        // Create new room state with default values
        const newRoomState = {
          videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
          timestamp: 0,
          lastUpdate: Date.now(),
          isPlaying: false
        };
        roomStates.set(roomId, newRoomState);
        
        // Send the newly created state
        socket.emit('roomState', newRoomState);
        console.log(`Created and sent new room state for room ${roomId}:`, newRoomState);
      }
    });

    // Handle incoming messages
    socket.on('message', (data) => {
      console.log(`Received message from ${socket.id}: ${data.msg}`);
      socket.to(data.room).emit('broadcast', data.msg);
    });
    
    socket.on('sendMessage', (data) => {
      const message = `${socket.id}: ${data.msg}`
      io.to(data.room).emit('sendMessage', message);
    });

    socket.on('changeVideo', (data) => {
      console.log(`User ${socket.id} changed video to: ${data.link}`);
      io.to(data.room).emit('sendMessage', `${socket.id} has changed the video.`);
      io.to(data.room).emit('changeBroadcastVideo', data.link);

      // Get existing room state or create new one
      const roomState = roomStates.get(data.room) || {};
      
      roomStates.set(data.room, {
        ...roomState,
        videoUrl: data.link, 
        timestamp: 0,
        lastUpdate: Date.now(),
        isPlaying: false // Reset playing state when video changes
      });
    });

    //handlePlay from frontend with improved event handling
    socket.on('play', (data) => {
      console.log(`Received playVideo from ${socket.id}: ${data.message}`);
      
      // Get existing room state
      const roomState = roomStates.get(data.room) || {
        videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
        timestamp: 0,
        lastUpdate: Date.now(),
        isPlaying: false
      };
      
      // Only update timestamp if it's valid (not 0 when video has progressed)
      const timestamp = (data.time > 0) ? data.time : roomState.timestamp;
      
      // Update room state
      roomStates.set(data.room, {
        ...roomState,
        timestamp: timestamp,
        lastUpdate: Date.now(),
        isPlaying: true
      });

      // Send a single system message to ALL clients
      io.to(data.room).emit('sendMessage', `${socket.id} has played the video.`);

      // Tell other clients to play with the current timestamp
      socket.to(data.room).emit('changeBroadcastPlay', {
        time: timestamp
      });
    });

    //handlePause from frontend with improved event handling
    socket.on('pause', (data) => {
      console.log(`Received pauseVideo from ${socket.id}: ${data.message}`);
      
      // Get existing room state
      const roomState = roomStates.get(data.room) || {
        videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
        timestamp: 0,
        lastUpdate: Date.now(),
        isPlaying: false
      };
      
      // Only update timestamp if it's valid (not 0 when video has progressed)
      const timestamp = (data.time > 0) ? data.time : roomState.timestamp;
      
      // Update room state
      roomStates.set(data.room, {
        ...roomState,
        timestamp: timestamp,
        lastUpdate: Date.now(),
        isPlaying: false
      });
      
      // Send a single message to ALL clients
      io.to(data.room).emit('sendMessage', `${socket.id} has paused the video.`);
      
      // Tell other clients to pause with the current timestamp
      socket.to(data.room).emit('changeBroadcastPause', {
        time: timestamp
      });
    });

    socket.on('timeUpdate', (data) => {
      console.log('timeOrignal: ', data.time);
      
      // Only broadcast seek events to other clients, not the sender
      socket.to(data.room).emit('changeBroadcastSeek', data.time);
    });

    // Handle manual sync requests from clients
    socket.on('requestSync', (data) => {
      console.log(`Sync requested by ${socket.id} for room ${data.room}`);
      
      const roomState = roomStates.get(data.room);
      if (roomState) {
        // Send the current room state back to just this client
        socket.emit('roomState', roomState);
        console.log(`Sent room state to ${socket.id} after sync request:`, roomState);
      }
    });

    // Receive periodic updates from clients
    socket.on('heartbeat', (data) => {
      const roomState = roomStates.get(data.room);
      if (roomState && typeof data.time === 'number' && data.time > 0) {
        // Only update timestamp if it's a valid value
        roomStates.set(data.room, {
          ...roomState,
          timestamp: data.time,
          lastUpdate: Date.now()
        });
        console.log(`Updated room ${data.room} timestamp to ${data.time} via heartbeat`);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      
      // Get rooms this socket was in from our tracking map
      const socketRoomSet = socketRooms.get(socket.id);
      if (socketRoomSet) {
        // Update user count for each room this socket was in
        socketRoomSet.forEach(roomId => {
          // Get the updated count (might be 0 if room is empty now)
          const numClients = io.sockets.adapter.rooms.get(roomId)?.size || 0;
          
          // Send update to remaining users
          io.to(roomId).emit('roomUpdate', {roomId, numClients});
          
          // Send message that user left
          io.to(roomId).emit('sendMessage', `A user has left the room.`);
          
          console.log(`Updated room ${roomId}: ${numClients} users remaining`);
        });
        
        // Clean up our tracking map
        socketRooms.delete(socket.id);
      }
    });
  });

  // Clean up empty rooms periodically
  setInterval(() => {
    for (const [roomId, state] of roomStates.entries()) {
      const room = io.sockets.adapter.rooms.get(roomId);
      if (!room || room.size === 0) {
        roomStates.delete(roomId);
        console.log(`Cleaned up empty room: ${roomId}`);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  // Start the server
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}).catch(err => {
  console.error('Error occurred starting server:', err);
  process.exit(1);
});
