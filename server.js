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

    socket.on('changeVideo', (link) => {
        console.log(link);
        io.emit('changeBroadcastVideo', link);
    });

    //handlePlay from frontend
    socket.on('play', (msg) => {
        console.log(`Received playVideo from ${socket.id}: ${msg}`);
        io.emit('changeBroadcastPlay');
        io.emit('sendMessage', `${socket.id} has played the video.`);
    });

    //handlePause from frontend
    socket.on('pause', (msg) => {
        console.log(`received pauseVideo from ${socket.id}: ${msg}`);
        io.emit('changeBroadcastPause');
        io.emit('sendMessage', `${socket.id} has paused the video.`);
    });

    socket.on('timeUpdate', (time) => {
        console.log(time);
        io.emit('changeBroadcastSeek', time);
    })

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