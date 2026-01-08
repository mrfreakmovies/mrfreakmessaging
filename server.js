const io = require('socket.io')(process.env.PORT || 3000, { cors: { origin: "*" } });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 1. Connect to MongoDB
mongoose.connect('YOUR_MONGODB_LINK_HERE')
    .then(() => console.log("Connected to Database"))
    .catch(err => console.log("DB Error:", err));

// 2. Define how a User and Message look
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: { type: String }
});
const MessageSchema = new mongoose.Schema({
    from: String, to: String, message: String, timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

let onlineUsers = [];

io.on('connection', (socket) => {
    // SIGN UP
    socket.on('signup', async (data) => {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        try {
            const newUser = new User({ username: data.username, password: hashedPassword });
            await newUser.save();
            socket.emit('auth-success', { username: data.username });
        } catch (e) { socket.emit('error', 'Username taken'); }
    });

    // LOGIN
    socket.on('login', async (data) => {
        const user = await User.findOne({ username: data.username });
        if (user && await bcrypt.compare(data.password, user.password)) {
            socket.username = user.username;
            onlineUsers.push({ id: socket.id, nickname: user.username });
            socket.emit('auth-success', { username: user.username });
            io.emit('update-users', onlineUsers);
        } else { socket.emit('error', 'Invalid Login'); }
    });

    // LOAD CHAT HISTORY
    socket.on('get-history', async (data) => {
        const chats = await Message.find({
            $or: [
                { from: data.me, to: data.with },
                { from: data.with, to: data.me }
            ]
        }).sort('timestamp');
        socket.emit('chat-history', chats);
    });

    // SAVE & SEND PRIVATE MSG
    socket.on('private-msg', async (data) => {
        const msg = new Message({ from: data.from, to: data.toName, message: data.message });
        await msg.save();
        io.to(data.toId).emit('new-msg', { message: data.message, fromName: data.from, fromId: socket.id });
    });

    socket.on('disconnect', () => {
        onlineUsers = onlineUsers.filter(u => u.id !== socket.id);
        io.emit('update-users', onlineUsers);
    });
});
