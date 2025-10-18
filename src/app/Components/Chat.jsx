"use client";

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../fireBaseDB";
import styles from "../CSS/chat.module.css";

export default function Chat({ isOpen, onClose, recipientEmail, jobTitle }) {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const chatId = user && recipientEmail ? 
    [user.email, recipientEmail].sort().join('_').replace(/[^a-zA-Z0-9_]/g, '') : 
    null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && recipientEmail && isOpen && chatId) {
      fetchMessages();
      // Set up polling for real-time messages (every 2 seconds for better responsiveness)
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [user, recipientEmail, isOpen, chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!user || !recipientEmail || !chatId) return;
    
    try {
      const response = await fetch(`/api/chat/messages?chatId=${chatId}`);
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
      } else {
        console.error("Failed to fetch messages:", data.error);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatId || loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chatId,
          senderEmail: user.email,
          recipientEmail: recipientEmail,
          message: newMessage.trim(),
          jobContext: jobTitle
        })
      });

      if (response.ok) {
        setNewMessage("");
        // Immediately fetch messages to show the new message
        await fetchMessages();
      } else {
        const errorData = await response.json();
        console.error('Failed to send message:', errorData.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.chatContainer} ${isMinimized ? styles.minimized : ''}`}>
      <div className={styles.chatHeader}>
        <div className={styles.chatInfo}>
          <h4 className={styles.chatTitle}>
            Chat with {recipientEmail?.split('@')[0]}
          </h4>
          <span className={styles.jobContext}>About: {jobTitle}</span>
          {process.env.NODE_ENV === 'development' && (
            <span className={styles.debugInfo}>Chat ID: {chatId}</span>
          )}
        </div>
        <div className={styles.chatControls}>
          <button 
            className={styles.minimizeBtn}
            onClick={() => setIsMinimized(!isMinimized)}
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
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index}
                  className={`${styles.message} ${
                    message.senderEmail === user?.email ? styles.sent : styles.received
                  }`}
                >
                  <div className={styles.messageContent}>
                    <p>{message.message}</p>
                    <span className={styles.messageTime}>
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className={styles.messageForm}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className={styles.messageInput}
              disabled={loading}
            />
            <button 
              type="submit" 
              className={styles.sendBtn}
              disabled={loading || !newMessage.trim()}
            >
              {loading ? "..." : "Send"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}