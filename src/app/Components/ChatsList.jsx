"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../fireBaseDB";
import styles from "../CSS/chatsList.module.css";

export default function ChatsList() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  },  []);

  useEffect(() => {
    if (user) {
      fetchChats();
      
      // tell navbar msgs are viewed
      window.dispatchEvent(new CustomEvent('messagesRead', { 
        detail: { userEmail: user.email } 
      }));
    }
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;
    
    setLoading(true);
    const response = await fetch(`/api/chat/list?userEmail=${encodeURIComponent(user.email)}`);
    const data = await response.json();
    
    if (response.ok) {
      setChats(data.chats || []);
    } else {
      setChats([]);
    }
    setLoading(false);
  };

  const openChat = (chat) => {
    const otherUser = chat.participants.find(p => p !== user.email);
    
    // Create a tab in the MessageNotifications component
    window.dispatchEvent(new CustomEvent('openChatTab', { 
      detail: { 
        sender: otherUser,
        jobTitle: chat.jobContext || "General Chat",
        lastMessage: chat.lastMessage || "",
        timestamp: new Date(chat.lastMessageTime || Date.now()),
        unreadCount: 0 // Reset since user is opening it
      } 
    }));
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Please sign in to view your messages</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Your Messages</h1>
        <p className={styles.subtitle}>
          {chats.length} active conversation{chats.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading your conversations...</div>
      ) : chats.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No conversations yet</h3>
          <p>Start a conversation by contacting someone about a job opportunity!</p>
          <a href="/explore" className={styles.exploreLink}>
            Explore Jobs
          </a>
        </div>
      ) : (
        <div className={styles.chatsList}>
          {chats.map((chat) => {
            const otherUser = chat.participants.find(p => p !== user.email);
            return (
              <div 
                key={chat.chatId} 
                className={styles.chatItem}
                onClick={() => openChat(chat)}
              >
                <div className={styles.chatInfo}>
                  <h3 className={styles.chatUser}>{otherUser?.split('@')[0]}</h3>
                  <p className={styles.chatContext}>About: {chat.jobContext || "General"}</p>
                  <p className={styles.lastMessage}>
                    {chat.lastMessage?.length > 50 
                      ? `${chat.lastMessage.substring(0, 50)}...` 
                      : chat.lastMessage || "No messages yet"}
                  </p>
                </div>
                <div className={styles.chatMeta}>
                  <span className={styles.chatTime}>
                    {chat.lastMessageTime 
                      ? new Date(chat.lastMessageTime).toLocaleDateString() 
                      : new Date(chat.createdAt).toLocaleDateString()}
                  </span>
                  <div className={styles.clickHint}>Click to chat</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}