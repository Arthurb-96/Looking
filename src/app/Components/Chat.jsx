'use client';

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../fireBaseDB';
import styles from '../CSS/chat.module.css';

const Chat = ({ recipientEmail, jobTitle, onClose, isOpen = true, isMinimized = false, setIsMinimized, style = {} }) => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [new_msg, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [other_typing, setOtherUserTyping] = useState(false);
  const [is_connected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
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
    const socket_url = process.env.NODE_ENV === 'production' 
      ? process.env.NEXTAUTH_URL 
      : 'http://localhost:3000';
    
    const newsocket = io(socket_url, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    newsocket.on('connect', () => {
      setIsConnected(true);
      newsocket.emit('user_join', user.email);
      
      newsocket.emit('join_chat', {
        user1: user.email,
        user2: recipientEmail
      });
    });

    newsocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newsocket.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
    });

    newsocket.on('chat_history', (history) => {
      setMessages(history);
      const chatRoom = [user.email, recipientEmail].sort().join('_');
      newsocket.emit('mark_read', { chatRoom, userEmail: user.email });
    });

    newsocket.on('receive_message', (message) => {
      setMessages(prev => [...prev, message]);
      
      if (message.recipient === user.email) {
        const chatRoom = [user.email, recipientEmail].sort().join('_');
        newsocket.emit('mark_read', { chatRoom, userEmail: user.email });
      }
    });

    newsocket.on('user_typing', (userEmail) => {
      if (userEmail === recipientEmail) {
        setOtherUserTyping(true);
      }
    });

    newsocket.on('user_stop_typing', (userEmail) => {
      if (userEmail === recipientEmail) {
        setOtherUserTyping(false);
      }
    });

    newsocket.on('messages_read', ({ reader }) => {
      if (reader === recipientEmail) {
        setMessages(prev => prev.map(msg => 
          msg.sender === user.email ? { ...msg, read: true } : msg
        ));
      }
    });

    setSocket(newsocket);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!new_msg.trim() || !socket || !user) return;

    const messageData = {
      recipient: recipientEmail,
      message: new_msg.trim(),
      sender: user.email
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
    
    handleStopTyping();

    window.dispatchEvent(new CustomEvent('newMessageReceived', { 
      detail: { sender: user.email, recipient: recipientEmail, hasUnread: true } 
    }));
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

  if (!isOpen) return null;

  return (
    <div 
      className={`${styles.chatContainer} ${isMinimized ? styles.minimized : ''}`}
      style={style}
    >
      <div className={styles.chatHeader}>
        <div className={styles.chatInfo}>
          <h4 className={styles.chatTitle}>
            Chat with {recipientEmail?.split('@')[0]}
          </h4>
          {is_connected && (
            <span className={styles.connectionStatus}>🟢 Connected</span>
          )}
        </div>
        <div className={styles.chatControls}>
          <button 
            className={styles.minimizeBtn}
            onClick={() => setIsMinimized && setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? "⬆️" : "⬇️"}
          </button>
          <button 
            className={styles.closeBtn}
            onClick={onClose}
            title="Close chat"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div className={styles.noMessages}>
                <p>Start the conversation about this job opportunity!</p>
                {jobTitle && <p className={styles.jobContext}>Regarding: {jobTitle}</p>}
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index}
                  className={`${styles.message} ${
                    message.sender === user?.email ? styles.sent : styles.received
                  }`}
                >
                  <div className={styles.messageContent}>
                    <p>{message.message}</p>
                    <span className={styles.messageTime}>
                      {formatTime(message.timestamp)}
                    </span>
                    {message.read && message.sender === user?.email && (
                      <span className={styles.readIndicator}>✓✓</span>
                    )}
                  </div>
                </div>
              ))
            )}
            {other_typing && (
              <div className={styles.typingIndicator}>
                <span>{recipientEmail?.split('@')[0]} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className={styles.messageForm}>
            <input
              type="text"
              value={new_msg}
              onChange={handleTyping}
              placeholder="Type your message..."
              className={styles.messageInput}
              disabled={loading || !is_connected}
            />
            <button 
              type="submit" 
              className={styles.sendBtn}
              disabled={loading || !new_msg.trim() || !is_connected}
            >
              {loading ? "..." : "Send"}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default Chat;