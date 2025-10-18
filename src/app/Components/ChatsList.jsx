"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../fireBaseDB";
import Chat from "./Chat";
import styles from "../CSS/chatsList.module.css";

export default function ChatsList() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/chat/list?userEmail=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      
      if (response.ok) {
        setChats(data.chats || []);
      } else {
        console.error("Failed to fetch chats:", data.error);
        setChats([]);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (chat) => {
    const otherUser = chat.participants.find(p => p !== user.email);
    setSelectedChat({
      recipientEmail: otherUser,
      jobTitle: chat.jobContext || "General Chat"
    });
  };

  const closeChat = () => {
    setSelectedChat(null);
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

      {/* Chat Component */}
      {selectedChat && (
        <Chat 
          isOpen={!!selectedChat}
          onClose={closeChat}
          recipientEmail={selectedChat.recipientEmail}
          jobTitle={selectedChat.jobTitle}
        />
      )}
    </div>
  );
}