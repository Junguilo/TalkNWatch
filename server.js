const http = require('http');
const server = http.createServer(); //creates a server on 8080
const { Server } = require("socket.io");
// Configure Socket.IO with CORS enabled, needs to be changed when we have a server up and running to our actual web address
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins, will be changed to talk.vercel later soon. 
        methods: ["GET", "POST"]
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
        io.emit('broadcast', msg);
        console.log("Broadcasted message to all clients");
    });
    
    //socket.on('changeTime', ())

    // Handle errors
    socket.on('error', (error) => { //on receives data
        console.error("Socket error:", error);
    });
    
    // Handle disconnection //on receives data
    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });
});

// Start the server
server.listen(8080, () => {
    console.log('Server listening on port 8080');
});