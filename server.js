const io = require('socket.io')(process.env.PORT || 3000, {
    cors: { origin: "*" } // This allows your Vercel site to talk to this server
});

let users = [];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. When a user joins and sets their nickname
    socket.on('store-user', (nickname) => {
        // Remove old entry if same ID exists
        users = users.filter(u => u.id !== socket.id);
        users.push({ id: socket.id, nickname: nickname });
        
        // Tell everyone who is online
        io.emit('update-users', users);
    });

    // 2. Handling Private Messages
    socket.on('private-msg', (data) => {
        io.to(data.to).emit('new-msg', {
            message: data.message,
            fromId: socket.id,
            fromName: data.from
        });
    });

    // 3. VIDEO CALL SIGNALING (The part we just added)
    // This sends your "Peer ID" to the person you are calling
    socket.on('request-video-id', (data) => {
        io.to(data.to).emit('receive-video-id', { 
            peerId: data.myPeerId, 
            fromName: data.fromName 
        });
    });

    // 4. Handling Disconnects
    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('update-users', users);
        console.log('User disconnected');
    });
});
