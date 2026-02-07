// Dashboard.js
import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, LogOut, User, MessageSquare } from 'lucide-react'; // npm install lucide-react
import './Dashboard.css';

const Dashboard = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const PAGE_ACCESS_TOKEN = 'EAARO9SRZBvPABOxwc72POrPOFRQtnnq73FiyxmgUpmERQ15UX7r8GJvsyWyFLIU4PqnwbMG4IvCUqVAuwzreXluiRv6pK7WZAQCdG1yWFvSLOgVcmupRv9GlxU5lzFoFEhbcl1gSHwyHvzI6Cr9ZBnoAO7ZAk0Nlmdt2iQBvEqhG9ZCb2cMskUD7eXu3R3Ks7obVVAPXD'; // ← MOVE TO BACKEND!

  useEffect(() => {
    // Initialize FB SDK (still needed if using window.FB.api)
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: '1212714693082352',
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v19.0',
      });
    };

    (function (d, s, id) {
      let js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));

    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/me/conversations?access_token=${PAGE_ACCESS_TOKEN}&fields=id,participants,snippet,updated_time,unread_count`
      );
      const data = await response.json();

      if (data?.data) {
        const convs = data.data
          .map(conv => {
            const participant = conv.participants.data.find(p => p.id !== '61556576464672'); // your page id
            return participant ? {
              id: conv.id,
              participant,
              snippet: conv.snippet || 'No message preview',
              unread: conv.unread_count || 0,
              updated_time: conv.updated_time,
            } : null;
          })
          .filter(Boolean)
          .sort((a, b) => new Date(b.updated_time) - new Date(a.updated_time)); // newest first

        setConversations(convs);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      // Better: use direct Graph API fetch instead of window.FB.api for consistency
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${convId}/messages?access_token=${PAGE_ACCESS_TOKEN}&fields=message,from,created_time,attachments&limit=20`
      );
      const data = await response.json();

      if (data?.data) {
        setSelectedConversation({
          id: convId,
          messages: data.data.reverse(), // oldest → newest
          participant: conversations.find(c => c.id === convId)?.participant,
        });
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;

    try {
      const recipientId = selectedConversation.participant.id;

      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: replyText },
          }),
        }
      );

      if (res.ok) {
        setReplyText('');
        fetchMessages(selectedConversation.id); // refresh messages
        fetchConversations(); // refresh list (snippet/unread)
      } else {
        alert('Failed to send reply');
      }
    } catch (err) {
      console.error('Reply error:', err);
    }
  };

  const handleAttachment = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    alert(`Attachment selected: ${file.name} (upload not implemented yet)`);
    // TODO: Implement file upload via Graph API (message.attachments)
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="logo">
          <MessageSquare size={28} />
          <span>BIZchat</span>
        </div>
        <div className="user-menu">
          <User size={20} />
          <button onClick={() => alert('Logout not implemented')} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="main-layout">
        {/* Left - Conversation List */}
        <aside className="conversation-list">
          <h3>Messages</h3>
          {loading ? (
            <p>Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p>No conversations yet.</p>
          ) : (
            <ul>
              {conversations.map(conv => (
                <li
                  key={conv.id}
                  className={`conv-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => fetchMessages(conv.id)}
                >
                  <div className="conv-avatar">
                    {/* Placeholder avatar – you can use participant.profile_pic if available */}
                    <div className="avatar-placeholder" />
                  </div>
                  <div className="conv-info">
                    <div className="conv-name">{conv.participant.name}</div>
                    <div className="conv-snippet">{conv.snippet}</div>
                  </div>
                  {conv.unread > 0 && (
                    <span className="unread-badge">{conv.unread}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Right - Chat Area */}
        <main className="chat-area">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <h2>{selectedConversation.participant.name}</h2>
              </div>

              <div className="messages-container">
                {selectedConversation.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`message-bubble ${msg.from.id === '61556576464672' ? 'sent' : 'received'}`}
                  >
                    <p>{msg.message}</p>
                    <span className="timestamp">
                      {new Date(msg.created_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="reply-bar">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type a message..."
                  rows={1}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <div className="reply-actions">
                  <label className="attach-btn">
                    <Paperclip size={20} />
                    <input type="file" hidden onChange={handleAttachment} />
                  </label>
                  <button className="send-btn" onClick={handleSendReply} disabled={!replyText.trim()}>
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-chat">
              <MessageSquare size={64} />
              <p>Select a conversation to view messages</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;


