'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../fireBaseDB';
import { io } from 'socket.io-client';
import Chat from './Chat';
import styles from '../CSS/messageNotifications.module.css';

const MessageNotifications = () => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [active_chats, setActiveChats] = useState([]);
  const [chat_tabs, setChatTabs] = useState([]);
  const [auth_ready, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setAuthReady(true);
      
      if (authUser?.email) {
        const saved = localStorage.getItem(`chatTabs_${authUser.email}`);
        if (saved) {
          const tabs = JSON.parse(saved);
          const valid = tabs.filter(tab => 
            tab.sender && 
            tab.sender.includes('@') && 
            tab.sender !== authUser.email
          );
          
          if (valid.length > 0) {
            setChatTabs(valid);
          }
        }
      }
    });
    return unsubscribe;
  }, []);

  // save tabs to localstorage
  useEffect(() => {
    if (user?.email && chat_tabs.length > 0) {
      const tabs_to_save = chat_tabs.map(tab => ({
        ...tab,
        isOpen: false
      }));
      localStorage.setItem(`chatTabs_${user.email}`, JSON.stringify(tabs_to_save));
    } else if (user?.email && chat_tabs.length === 0) {
      localStorage.removeItem(`chatTabs_${user.email}`);
    }
  }, [chat_tabs, user?.email]);

  // listen for open chat events from other compoennts
  useEffect(() => {
    const handleOpenChatTab = (event) => {
      const { sender, jobTitle, lastMessage, timestamp, unreadCount } = event.detail;
      const existing = chat_tabs.find(tab => tab.sender === sender);
      
      if (existing) {
        setChatTabs(prev => prev.map(tab => 
          tab.sender === sender 
            ? { 
                ...tab, 
                lastMessage: lastMessage || tab.lastMessage,
                timestamp: timestamp || tab.timestamp,
                jobTitle: jobTitle || tab.jobTitle,
                unreadCount: (tab.unreadCount || 0) + (unreadCount || 0),
                isFlashing: unreadCount > 0
              }
            : tab
        ));
        
        if (unreadCount > 0) {
          setTimeout(() => setChatTabs(prev => prev.map(tab => 
            tab.sender === sender ? { ...tab, isFlashing: false } : tab
          )), 1000);
        }
        
        if (!unreadCount) handleTabClick(existing);
      } else {
        setChatTabs(prev => [...prev, {
          id: Date.now(),
          sender,
          lastMessage: lastMessage || '',
          timestamp: timestamp || new Date(),
          jobTitle: jobTitle || 'Chat',
          unreadCount: unreadCount || 0,
          isOpen: false,
          isFlashing: unreadCount > 0
        }]);
        
        if (unreadCount > 0) {
          setTimeout(() => setChatTabs(prev => prev.map(tab => 
            tab.sender === sender ? { ...tab, isFlashing: false } : tab
          )), 1000);
        } else {
          setTimeout(() => handleTabClick({ sender, jobTitle }), 100);
        }
      }
    };

    window.addEventListener('openChatTab', handleOpenChatTab);
    return () => window.removeEventListener('openChatTab', handleOpenChatTab);
  }, [chat_tabs]);

  useEffect(() => {
    if (user) {
      const socket_url = 'http://localhost:3000';
      
      const newsocket = io(socket_url, {
        transports: ['polling', 'websocket'],
        upgrade: true,
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
      });
      setSocket(newsocket);

      newsocket.emit('user_join', user.email);

      newsocket.on('new_message_notification', (data) => {
        if (data.sender !== user.email) {
          showNotification(data);
        }
      });

      return () => {
        newsocket.disconnect();
      };
    }
  }, [user]);

  const showNotification = (msg_data) => {
    // dispatch event to open the chat tab
    window.dispatchEvent(new CustomEvent('openChatTab', { 
      detail: { 
        sender: msg_data.sender,
        jobTitle: msg_data.jobTitle || 'New Message',
        lastMessage: msg_data.message,
        timestamp: new Date(msg_data.timestamp || Date.now()),
        unreadCount: 1
      } 
    }));

    window.dispatchEvent(new CustomEvent('newMessageReceived', { 
      detail: { sender: msg_data.sender, hasUnread: true } 
    }));
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const handleTabClick = (tab) => {
    const is_open = active_chats.find(chat => chat.recipient === tab.sender);
    
    if (is_open) {
      setActiveChats(prev => prev.filter(chat => chat.recipient !== tab.sender));
      setChatTabs(prev => prev.map(t => 
        t.id === tab.id ? { ...t, isOpen: false } : t
      ));
    } else {
      setActiveChats(prev => [...prev, {
        id: Date.now(),
        recipient: tab.sender,
        jobTitle: tab.jobTitle,
        isMinimized: false
      }]);
      
      setChatTabs(prev => prev.map(t => 
        t.id === tab.id ? { ...t, isOpen: true, unreadCount: 0 } : t
      ));

      // tell navbar that messages were read
      window.dispatchEvent(new CustomEvent('messagesRead', { 
        detail: { sender: tab.sender } 
      }));
    }
  };

  const closeTab = (tab_id, e) => {
    e.stopPropagation();
    const tab = chat_tabs.find(t => t.id === tab_id);
    if (tab) setActiveChats(prev => prev.filter(chat => chat.recipient !== tab.sender));
    setChatTabs(prev => prev.filter(t => t.id !== tab_id));
  };

  const closeChatBox = (chatId) => {
    setActiveChats(prev => prev.filter(chat => chat.id !== chatId));
  };

  const minimizeChatBox = (chatId, minimized) => {
    setActiveChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, isMinimized: minimized } : chat
    ));
  };

  if (!auth_ready || (!user && chat_tabs.length === 0)) return null;

  return (
    <div className={styles.notificationsContainer}>
      {chat_tabs.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '0',
          right: '20px',
          display: 'flex',
          gap: '5px',
          zIndex: 9998
        }}>
          {chat_tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              style={{
                background: tab.isOpen ? '#1877F2' : '#42424A',
                color: 'white',
                padding: '10px 15px',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                minWidth: '200px',
                maxWidth: '250px',
                border: '1px solid #ccc',
                borderBottom: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                animation: tab.isFlashing ? 'flash 0.5s ease-in-out 2' : 'none'
              }}
            >
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span>{tab.sender.split('@')[0]}</span>
                  {tab.unreadCount > 0 && (
                    <span style={{
                      background: '#FF4444',
                      color: 'white',
                      borderRadius: '50%',
                      padding: '2px 6px',
                      fontSize: '11px',
                      minWidth: '18px',
                      textAlign: 'center'
                    }}>
                      {tab.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => closeTab(tab.id, e)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginLeft: '10px',
                  opacity: 0.7,
                  padding: '0',
                  minWidth: '20px'
                }}
                onMouseOver={(e) => e.target.style.opacity = '1'}
                onMouseOut={(e) => e.target.style.opacity = '0.7'}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {active_chats.map((chat, index) => (
        <Chat
          key={chat.id}
          recipientEmail={chat.recipient}
          jobTitle={chat.jobTitle}
          isOpen={true}
          isMinimized={chat.isMinimized}
          setIsMinimized={(minimized) => minimizeChatBox(chat.id, minimized)}
          onClose={() => closeChatBox(chat.id)}
          style={{
            position: 'fixed',
            bottom: '60px',
            right: `${20 + (index * 320)}px`,
            width: '300px',
            zIndex: 9999
          }}
        />
      ))}
      
      <style jsx>{`
        @keyframes flash {
          0%, 100% { background-color: #42424A; }
          50% { background-color: #FF4444; }
        }
      `}</style>
    </div>
  );
};

export default MessageNotifications;