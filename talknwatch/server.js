const http = require('http');
const express = require('express');
const path = require('path');
const app = express();
const { Server } = require("socket.io");
const {v4: uuidv4} = require("uuid");

// Serve static files
app.use(express.static(__dirname));

// Track which rooms each socket belongs to
const socketRooms = new Map(); //socketId -> Set of roomIds
const roomStates = new Map(); // roomId -> {videoUrl, timestamp, lastUpdate}

// Routes to serve pages
app.get('/', (req, res) => {
    console.log("test");
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/room/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'room.html'));
});

/* DO LATER LATER LATER
Need to add a thing where the room gets added to a cache service like redis
I wouldn't want people to create their own rooms using 
room/COCK, or whatever. You're only able to join rooms where the room is available.
When the room gets disconnected, pop the room and you're unable to join it
*/
app.get('/hostRoom', (req, res) => {
    const roomId = uuidv4();
    res.redirect(`/room/${roomId}`);
});

const server = http.createServer(app);

// Configure Socket.IO with CORS enabled
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5500", 
            "http://127.0.0.1:5500", 
            "https://talknwatch.onrender.com",
            "*" // Allow connections from any origin (you can restrict this later)
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

var suppressEvent = false; //change this to rooms later on

// Socket.IO connection handling
/*
JSON:
{
        "room": roomId,
        "status": "paused",
        "videoID": "M7lc1UVf",
        "timestamp": 83.5,
        "lastUpdate": 1719080000
    }
};

OHH just keep a cache when a new user joins the link, 
So we
*/
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
        
        // Send welcome message to just this socket
        //socket.emit('signal', 'Connected to server successfully!');
        
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

    // Send a signal to the connected client
    console.log("Signal sent to client", socket.id);

    // Handle incoming messages
    socket.on('message', (data) => {
        console.log(`Received message from ${socket.id}: ${data.msg}`);
        
        // Broadcast message to all clients, with the use of io.emit
        //remember that io emit will allow you to see the console messages
        socket.to(data.room).emit('broadcast', data.msg);
        //console.log("Broadcasted message to all clients");
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

    // Handle errors
    socket.on('error', (error) => { //on receives data
        console.error("Socket error:", error);
    });
    
    // Handle disconnection //on receives data
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
});

app.get('/status', (req, res) => {
  res.status(200).send('Server is running');
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});