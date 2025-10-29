const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: dev ? ["http://localhost:3000", "http://localhost:3001"] : process.env.NEXTAUTH_URL,
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['polling', 'websocket'],
    allowUpgrades: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Store active users and their rooms
  const activeUsers = new Map();
  const chatRooms = new Map();

  io.on('connection', (socket) => {
    socket.on('user_join', (userEmail) => {
      activeUsers.set(socket.id, userEmail);
      socket.userEmail = userEmail;
      
      socket.join(`user_${userEmail}`);
      
      // Emit online status to all users
      socket.broadcast.emit('user_online', userEmail);
    });

    // Join a chat room (between two users)
    socket.on('join_chat', async ({ user1, user2 }) => {
      // Create consistent room name regardless of order
      const roomName = [user1, user2].sort().join('_');
      socket.join(roomName);
      
      if (!chatRooms.has(roomName)) {
        chatRooms.set(roomName, { users: [user1, user2], messages: [] });
      }
      
      try {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        const db = client.db(process.env.MONGODB_DB || "myapp");
        
        const messages = await db.collection('messages')
          .find({
            $or: [
              { sender: user1, recipient: user2 },
              { sender: user2, recipient: user1 }
            ]
          })
          .sort({ timestamp: 1 })
          .toArray();
        
        await client.close();
        
        chatRooms.get(roomName).messages = messages;
        
        socket.emit('chat_history', messages);
      } catch (error) {
        const room = chatRooms.get(roomName);
        socket.emit('chat_history', room.messages);
      }
    });

    // Handle sending messages
    socket.on('send_message', async ({ recipient, message, sender }) => {
      const roomName = [sender, recipient].sort().join('_');
      const messageData = {
        id: Date.now() + Math.random(),
        sender,
        recipient,
        message,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Store message in memory (for real-time)
      if (chatRooms.has(roomName)) {
        chatRooms.get(roomName).messages.push(messageData);
      } else {
        chatRooms.set(roomName, {
          users: [sender, recipient],
          messages: [messageData]
        });
      }

      // Also save to MongoDB for persistence
      try {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        const db = client.db(process.env.MONGODB_DB || "myapp");
        
        // Save message to messages collection
        await db.collection('messages').insertOne(messageData);
        
        // Update or create chat record
        const chatRecord = {
          participants: [sender, recipient],
          lastMessage: message,
          lastMessageTime: new Date().toISOString(),
          chatId: roomName
        };
        
        await db.collection('chats').updateOne(
          { chatId: roomName },
          { 
            $set: chatRecord,
            $setOnInsert: { createdAt: new Date().toISOString() }
          },
          { upsert: true }
        );
        
        await client.close();
      } catch (error) {
      }

      io.to(roomName).emit('receive_message', messageData);
      
      const notificationData = {
        sender,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        timestamp: messageData.timestamp
      };
      
      io.to(`user_${recipient}`).emit('new_message_notification', notificationData);
    });

    socket.on('mark_read', ({ chatRoom, userEmail }) => {
      if (chatRooms.has(chatRoom)) {
        const room = chatRooms.get(chatRoom);
        room.messages.forEach(msg => {
          if (msg.recipient === userEmail) {
            msg.read = true;
          }
        });
        
        // Notify the other user that messages were read
        socket.to(chatRoom).emit('messages_read', { reader: userEmail });
      }
    });

    // Get unread message count
    socket.on('get_unread_count', (userEmail) => {
      let unreadCount = 0;
      chatRooms.forEach((room, roomName) => {
        if (room.users.includes(userEmail)) {
          room.messages.forEach(msg => {
            if (msg.recipient === userEmail && !msg.read) {
              unreadCount++;
            }
          });
        }
      });
      
      socket.emit('unread_count', unreadCount);
    });

    // Get chat list for user
    socket.on('get_chat_list', (userEmail) => {
      const userChats = [];
      
      chatRooms.forEach((room, roomName) => {
        if (room.users.includes(userEmail)) {
          const otherUser = room.users.find(u => u !== userEmail);
          const lastMessage = room.messages[room.messages.length - 1];
          const unreadCount = room.messages.filter(msg => 
            msg.recipient === userEmail && !msg.read
          ).length;
          
          userChats.push({
            roomName,
            otherUser,
            lastMessage: lastMessage ? {
              text: lastMessage.message,
              timestamp: lastMessage.timestamp,
              sender: lastMessage.sender
            } : null,
            unreadCount
          });
        }
      });
      
      // Sort by last message timestamp
      userChats.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
      });
      
      socket.emit('chat_list', userChats);
    });

    // Handle typing indicators
    socket.on('typing_start', ({ chatRoom, userEmail }) => {
      socket.to(chatRoom).emit('user_typing', userEmail);
    });

    socket.on('typing_stop', ({ chatRoom, userEmail }) => {
      socket.to(chatRoom).emit('user_stop_typing', userEmail);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userEmail = activeUsers.get(socket.id);
      if (userEmail) {
        activeUsers.delete(socket.id);
        socket.broadcast.emit('user_offline', userEmail);
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log('> Socket.io server running');
  });
});