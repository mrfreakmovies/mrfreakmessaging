const io = require('socket.io')(process.env.PORT || 3000, {
    cors: { origin: "*" }
});

let users = [];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. Store User Nickname
    socket.on('store-user', (nickname) => {
        users = users.filter(u => u.id !== socket.id);
        users.push({ id: socket.id, nickname: nickname });
        io.emit('update-users', users);
    });

    // 2. Private Messaging
    socket.on('private-msg', (data) => {
        io.to(data.to).emit('new-msg', {
            message: data.message,
            fromId: socket.id,
            fromName: data.from
        });
    });

    // 3. Updated Calling Logic (Passes PeerID and Call Type)
    socket.on('request-video-id', (data) => {
        io.to(data.to).emit('receive-video-id', { 
            peerId: data.myPeerId, 
            fromName: data.fromName,
            isAudio: data.isAudio // Tells the receiver if it's voice or video
        });
    });

    // 4. Handle Disconnect
    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('update-users', users);
        console.log('User disconnected');
    });
});
