const http = require('http');
const express = require('express');
const path = require('path');
const app = express();
const { Server } = require("socket.io");
const {v4: uuidv4} = require("uuid");

// Serve static files
app.use(express.static(__dirname));

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
        socket.join(roomId);
        socket.to(roomId).emit('signal', 'Connected to server successfully!'); //socket.emit, sends to that specific client. 
        //when you join a room, it should update accordingly to the cache, need to do that later
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
        console.log(data.link);
        io.to(data.room).emit('sendMessage', `${socket.id} has changed the video.`);
        io.to(data.room).emit('changeBroadcastVideo', data.link);
    });

    //handlePlay from frontend with improved event handling
    socket.on('play', (data) => {
        console.log(`Received playVideo from ${socket.id}: ${data.message}`);

        // Send a single system message to ALL clients
        io.to(data.room).emit('sendMessage', `${socket.id} has played the video.`);

        // Tell other clients to play with the current timestamp
        socket.to(data.room).emit('changeBroadcastPlay', {
            time: data.time || 0
        });
    });

    //handlePause from frontend with improved event handling
    socket.on('pause', (data) => {
        console.log(`Received pauseVideo from ${socket.id}: ${data.message}`);
        
        // Send a single message to ALL clients
        io.to(data.room).emit('sendMessage', `${socket.id} has paused the video.`);
        
        // Tell other clients to pause with the current timestamp
        socket.to(data.room).emit('changeBroadcastPause', {
            time: data.time || 0
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
    });
});

app.get('/status', (req, res) => {
  res.status(200).send('Server is running');
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});