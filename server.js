const http = require('http');
const express = require('express');
const path = require('path');
const app = express();
const { Server } = require("socket.io");

// Serve static files
//app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')))

// Route to serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = http.createServer(app);

// Configure Socket.IO with CORS enabled
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5500", "http://127.0.0.1:5500", "*"], // Allow Live Server origins
        methods: ["GET", "POST"],
        credentials: true
    }
});

var suppressEvent = false; //change this to rooms later on

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log("New client connected", socket.id);
    
    // Send a signal to the connected client
    socket.emit('signal', 'Connected to server successfully!'); //socket.emit, sends to that specific client. 
    console.log("Signal sent to client", socket.id);
    
    // Handle incoming messages
    socket.on('message', (msg) => {
        console.log(`Received message from ${socket.id}: ${msg}`);
        
        // Broadcast message to all clients, with the use of io.emit
        //remember that io emit will allow you to see the console messages
        io.emit('broadcast', msg);
        console.log("Broadcasted message to all clients");
    });
    
    socket.on('sendMessage', (msg) => {
        const message = `${socket.id}: ${msg}`
        io.emit('sendMessage', message);
    });

    socket.on('sendSystemMessage', (msg) => {
        const message = `${msg}`
        io.emit('sendMessage', message);
    })

    socket.on('changeVideo', (link) => {
        console.log(link);
        io.emit('changeBroadcastVideo', link);
    });

    //handlePlay from frontend
    socket.on('play', (msg) => {
        console.log(`Received playVideo from ${socket.id}: ${msg.message}`);

        // Send a single system message to ALL clients
        io.emit('sendMessage', `${socket.id} has played the video.`);

        // Tell other clients to play (without sending messages)
        socket.broadcast.emit('changeBroadcastPlay', {
            id: socket.id,
            message: msg.message,
            original: false
        });

    });

    //handlePause from frontend
    socket.on('pause', (msg) => {
        console.log(`Received pauseVideo from ${socket.id}: ${msg.message}`);
        
        // Send a single message to ALL clients
        io.emit('sendMessage', `${socket.id} has paused the video.`);
        
        // Tell other clients to pause (without sending additional messages)
        socket.broadcast.emit('changeBroadcastPause', {
            id: socket.id,
            message: msg.message,
            original: false
        });
    });

    socket.on('timeUpdate', (time) => {
        //console.log(time);
        
        io.emit('sendMessage', `${socket.id} has moved the video from ${time.original} to ${time.current}`);
        socket.broadcast.emit('changeBroadcastSeek', time.current);
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
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});