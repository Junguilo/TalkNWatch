 var socket; //global socket variable
      //VIDEO JS Learning
      // Create <video> element
      const tag = document.createElement('video');
      tag.id = 'myVideo';
      tag.className = 'video-js vjs-default-skin';
      tag.setAttribute('controls', true);
      tag.setAttribute('width', 640);
      tag.setAttribute('height', 360);

      //Add to DOM
      document.getElementById('player').appendChild(tag);

      //Initialize Video.js
      const player = videojs('myVideo', {
        techOrder: ['youtube'],
        sources: [{
          type: 'video/youtube',
          src: 'https://www.youtube.com/watch?v=M7lc1UVf-VE'
        }],
        youtube: {
          modestbranding: 1,
          rel: 0
        }
      });

      const playerConfig = {
        techOrder: ['youtube'],
        youtube: {
          modestbranding: 1,
          rel: 0
        }
      };

      //CHANGE THE VIDEO FUNCTIONS
      function changeVideoEvent(){
        let videoUrl = document.forms["videoChange"]["videoName"].value;

        //change vid
        //changeVideo(videoUrl);
        socket.emit('changeVideo', videoUrl);
        return false;
      }
      
      // //this function will be used in the form of changing videos 
      // // and updating the videos for other users using broadcasting
      // //done this way for scaleability and so we don't run into errors in future
      function changeVideo(vid){
        // Change the video source
        player.src({
          type: 'video/youtube',
          src: vid
        });
        
        //Force thumbnail/poster update
        player.poster('');  // Clear existing poster
        
        //Load the new source
        player.load();
        
        //play the video once the user changes it
        player.play();
        
        //Prevent form submission to avoid page reload
        return false;
      }

      //this will sync their time with everyone,
      //only the host should have this but honestly ill do that lateer. 
      function getCurrTime(){
        const time = player.currentTime();
        socket.emit("timeUpdate", time);
      }

      function playerEvents(player, socket){
        player.ready(() => {
          console.log('Player is ready');

          player.on('play', () => {
            const msg = "Video is Playing from " + player.currentTime();
            //console.log("Emitting playVideo event:", msg);
            socket.emit("play", msg);
          });

          player.on('pause', () => {
            //console.log('Paused')
            const msg = "Video is Paused from " + player.currentTime();
            socket.emit("pause", msg)
          });
          
          let lastTime = 0;
          player.on('timeupdate', ()=>{
            const current = player.currentTime();
            if(Math.abs(current - lastTime) > 2){
              const msg = `Jumped from ${lastTime.toFixed(2)} to ${current.toFixed(2)}`;
              const time = current;
              socket.emit("timeUpdate", time);
              console.log(msg);
            }
            lastTime = current;
          });
        });
      }

      //submit message and broadcast
      function broadcastMessage(){
        let msg = document.forms["messageSubmit"]["messageText"].value;
        console.log(msg);
        socket.emit('sendMessage', msg);

        document.forms["messageSubmit"]["messageText"].value = '';

        return false;
      }


      // SOCKET.IO + video player event Listener at the very bottom
      //Add Socket.IO client script
      var socketScript = document.createElement('script');
      socketScript.src = "https://cdn.socket.io/4.7.4/socket.io.min.js";
      document.head.appendChild(socketScript);
      
      //Initialize Socket.IO connection after script loads
      socketScript.onload = function() {
        console.log("Socket.IO script loaded");
        
        //Create a div to show connection status
        const statusDiv = document.createElement('div');
        statusDiv.id = 'connection-status';
        statusDiv.textContent = 'Connecting to server...';
        document.body.appendChild(statusDiv);
        
        //Initialize Socket.IO connection 
        // Automatically detect the host
        const socketHost = 'http://localhost:8080';
          
        console.log(`Connecting to Socket.IO server at: ${socketHost}`);
        socket = io(socketHost, {
          reconnectionAttempts: 5,
          timeout: 10000,
          transports: ['websocket', 'polling']
        });
        
        //Connection established
        socket.on("connect", () => {
          console.log("Connected to Socket.IO server with ID:", socket.id);
          statusDiv.textContent = 'Connected to server';
          statusDiv.style.color = 'green';
          
          //Send a test message
          socket.emit("message", "Connection established");
        });
        
        //Receive server signal
        socket.on("signal", (data) => {
          console.log("Server signal:", data);
          //Display signal in UI
          const signalDiv = document.createElement('div');
          signalDiv.textContent = "Signal: " + data;
          document.body.appendChild(signalDiv);
        });
        
        //Listen for broadcast messages
        socket.on("broadcast", (data) => {
          console.log("Broadcast message:", data);
          // Display messages in UI
          const messageDiv = document.createElement('div');
          messageDiv.textContent = "Broadcast: " + data;
          document.body.appendChild(messageDiv);
        });

        socket.on("sendMessage", (msg) => {
            const messageDiv = document.createElement('div');
            messageDiv.textContent = msg;
            document.body.appendChild(messageDiv);
        });
        
        //Handle connection errors
        socket.on("connect_error", (error) => {
          console.error("Connection error:", error);
          statusDiv.textContent = 'Connection error';
          statusDiv.style.color = 'red';
        });
        
        //Handle disconnection
        socket.on("disconnect", (reason) => {
          console.log("Disconnected from Socket.IO server:", reason);
          statusDiv.textContent = 'Disconnected from server';
          statusDiv.style.color = 'orange';
        });
        
        //Listen for any errors
        socket.on("error", (error) => {
          console.error("Socket error:", error);
          statusDiv.textContent = 'Socket error';
          statusDiv.style.color = 'red';
        });
        
        //Add button to send test messages, a way to create a function through here
        const sendButton = document.createElement('button');
        sendButton.textContent = "Send Test Message";
        sendButton.onclick = function() {
          const message = "Test message from client at " + new Date().toLocaleTimeString();
          socket.emit("message", message);
          
          //Visual feedback that message was sent
          const sentDiv = document.createElement('div');
          sentDiv.textContent = "Sent: " + message;
          sentDiv.style.color = 'blue';
          document.body.appendChild(sentDiv);
          
          console.log("Sent message:", message);
        };
        document.body.appendChild(sendButton);
        
        //when the video has been changed, 
        //this will be broadcasted to everyone to change the video
        //gotta work on it working in rooms later, but this is good to see how it works
        socket.on("changeBroadcastVideo", (videoLink) => {
          changeVideo(videoLink);
        })

        socket.on("changeBroadcastPause", () => {
          player.pause();
        });

        socket.on("changeBroadcastPlay", () => {
          player.play();
        });

        socket.on("changeBroadcastSeek", (time) => {
          player.currentTime(time);
        });

        //VIDEO PLAYER HERE
        playerEvents(player, socket);
      };

