'use client';

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../fireBaseDB';
import styles from '../CSS/chat.module.css';

const Chat = ({ recipientEmail, jobTitle, onClose }) => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && recipientEmail) {
      initializeSocket();
    }
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, recipientEmail]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = () => {
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXTAUTH_URL 
      : 'http://localhost:3000';
    
    const newSocket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('user_join', user.email);
      newSocket.emit('join_chat', {
        user1: user.email,
        user2: recipientEmail
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('chat_history', (history) => {
      setMessages(history);
      const chatRoom = [user.email, recipientEmail].sort().join('_');
      newSocket.emit('mark_read', { chatRoom, userEmail: user.email });
    });

    newSocket.on('receive_message', (message) => {
      setMessages(prev => [...prev, message]);
      
      // Mark as read if it's for current user
      if (message.recipient === user.email) {
        const chatRoom = [user.email, recipientEmail].sort().join('_');
        newSocket.emit('mark_read', { chatRoom, userEmail: user.email });
      }
    });

    newSocket.on('user_typing', (userEmail) => {
      if (userEmail === recipientEmail) {
        setOtherUserTyping(true);
      }
    });

    newSocket.on('user_stop_typing', (userEmail) => {
      if (userEmail === recipientEmail) {
        setOtherUserTyping(false);
      }
    });

    newSocket.on('messages_read', ({ reader }) => {
      if (reader === recipientEmail) {
        setMessages(prev => prev.map(msg => 
          msg.sender === user.email ? { ...msg, read: true } : msg
        ));
      }
    });

    setSocket(newSocket);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !user) return;

    const messageData = {
      recipient: recipientEmail,
      message: newMessage.trim(),
      sender: user.email
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
    
    // Stop typing indicator
    handleStopTyping();
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && socket) {
      setIsTyping(true);
      const chatRoom = [user.email, recipientEmail].sort().join('_');
      socket.emit('typing_start', { chatRoom, userEmail: user.email });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping && socket) {
      setIsTyping(false);
      const chatRoom = [user.email, recipientEmail].sort().join('_');
      socket.emit('typing_stop', { chatRoom, userEmail: user.email });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!user) {
    return (
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.error}>Please sign in to chat</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h3 className={styles.title}>
              Chat with {recipientEmail.split('@')[0]}
            </h3>
            {jobTitle && (
              <p className={styles.subtitle}>About: {jobTitle}</p>
            )}
            <div className={styles.connectionStatus}>
              <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></span>
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>×</button>
        </div>

        <div className={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div className={styles.noMessages}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${
                  message.sender === user.email ? styles.sent : styles.received
                }`}
              >
                <div className={styles.messageContent}>
                  <p className={styles.messageText}>{message.message}</p>
                  <div className={styles.messageFooter}>
                    <span className={styles.messageTime}>
                      {formatTime(message.timestamp)}
                    </span>
                    {message.sender === user.email && (
                      <span className={`${styles.readStatus} ${message.read ? styles.read : styles.unread}`}>
                        {message.read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {otherUserTyping && (
            <div className={styles.typingIndicator}>
              <div className={styles.typingDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className={styles.typingText}>
                {recipientEmail.split('@')[0]} is typing...
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className={styles.messageForm}>
          <div className={styles.inputContainer}>
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type a message..."
              className={styles.messageInput}
              disabled={!isConnected}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!newMessage.trim() || !isConnected}
            >
              📤
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;