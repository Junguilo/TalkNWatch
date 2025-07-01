const http = require('http');
const server = http.createServer();
const { Server } = require("socket.io");
// Configure Socket.IO with CORS enabled
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"]
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log("New client connected", socket.id);
    
    // Send a signal to the connected client
    socket.emit('signal', 'Connected to server successfully!');
    console.log("Signal sent to client", socket.id);
    
    // Handle incoming messages
    socket.on('message', (msg) => {
        console.log(`Received message from ${socket.id}: ${msg}`);
        
        // Broadcast message to all clients
        io.emit('broadcast', msg);
        console.log("Broadcasted message to all clients");
    });
    
    // Handle errors
    socket.on('error', (error) => {
        console.error("Socket error:", error);
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });
});

// Start the server
server.listen(8080, () => {
    console.log('Server listening on port 8080');
});