# TalkNWatch
Youtube Watchparty with a few extra added features

## Installation

```bash
# Clone the repository
git clone <your-repository-url>

# Navigate to the project directory
cd TalkNWatch

# Install dependencies
npm install
```

## Running the Server

```bash
# Start the WebSocket server
npm start
```

## Testing the WebSocket Connection

1. Start the server using `npm start`
2. Open the `main.html` file in your browser (you can use a local server or just open it directly)
3. Open your browser's developer console (F12 or right-click > Inspect > Console)
4. You should see messages indicating the WebSocket connection is working:
   - "Connected to WebSocket server"
   - "Server message: Broadcast: Connection established"
5. Click the "Send Test Message" button to send additional messages
6. Open multiple browser windows with main.html to see messages broadcast to all clients
