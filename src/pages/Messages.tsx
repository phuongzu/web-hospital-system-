import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { API_BASE_URL, SOCKET_URL, getAuthToken, getDoctorId, getAvatarUrl, redirectToLoginPage } from '../utils/api';

// --- Type Definitions ---

interface User {
  _id: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface Reaction {
  user_id: User | string | any;
  emoji: string;
  createdAt?: string;
}

interface Message {
  _id: string;
  conversation_id?: string;
  sender_id: User | string | any;
  receiver_id: User | string | any;
  message: string;
  message_type: 'text' | 'image' | 'file';
  media_url?: string;
  media_name?: string;
  read?: boolean;
  timestamp?: string | number | Date;
  createdAt?: string;
  // CRUD & Reactions
  edited?: boolean;
  deleted?: boolean;
  reactions?: Reaction[];
  reactions_count?: number;
}

interface Conversation {
  _id: string;
  participant: User;
  last_message?: Message;
  last_message_at?: string | number | Date;
  unread_count: number;
  medical_record_id?: string;
}

// --- Helper Components ---

const ActionButton = ({ icon, onClick, color = "text-slate-400", hoverColor = "hover:text-blue-600" }: any) => (
  <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${color} ${hoverColor}`}>
    <span className="material-symbols-outlined text-[18px] md:text-[20px]">{icon}</span>
  </button>
);

const Messages: React.FC = () => {
  // --- State ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Input Emoji Picker
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  
  // Action States
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState('');
  const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null); // If not null, show picker for this message

  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const selectedConvRef = useRef<Conversation | null>(null);
  const handlerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null); // For input emoji picker
  const reactionPickerRef = useRef<HTMLDivElement>(null); // For message reaction picker
  const typingTimeoutRef = useRef<any>(null);
  const doctorId = getDoctorId();
  
  // Track optimistic messages
  const pendingMessageIds = useRef<Set<string>>(new Set());
  const pendingSocketMessages = useRef<Map<string, { resolve: Function, reject: Function }>>(new Map());

  // --- Effects ---

  useEffect(() => {
    selectedConvRef.current = selectedConv;
  }, [selectedConv]);

  // Handle click outside emoji pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Input Emoji Picker
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setShowInputEmojiPicker(false);
      }
      // Message Reaction Picker
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setReactingToMessageId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // --- Helpers ---

  const safeFormatTime = useCallback((dateStr?: string | number | Date): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const extractMessagePreview = useCallback((m: Message | undefined): string => {
    if (!m) return '';
    if (m.deleted) return '🚫 Message deleted';
    if (m.message_type === 'image') return '📷 Image';
    if (m.message_type === 'file') return '📎 Attachment';
    
    const raw: any = m;
    if (typeof raw === 'string') return raw;
    const text = raw.message || raw.content || raw.text || '';
    return typeof text === 'string' ? text.trim() : 'Message';
  }, []);

  const getSenderId = (sender: any): string => {
    if (!sender) return '';
    return typeof sender === 'object' ? sender._id : sender;
  };

  const getMediaUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, []);

  const markAsReadAPI = useCallback(async (conversationId: string) => {
    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { console.error('Read error:', e); }
  }, []);

  // --- API Handlers (CRUD) ---

  const handleDeleteMessage = async (messageId: string, type: 'me' | 'everyone') => {
    const ok = window.confirm(
      type === 'everyone'
        ? 'Delete for everyone?'
        : 'Delete for me?'
    );

  if (!ok) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/messages/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });

      if (res.ok) {
        // Optimistic update
        setMessages(prev => prev.map(m => {
          if (m._id !== messageId) return m;
          if (type === 'everyone') {
            return { ...m, deleted: true, message: 'This message was deleted' };
          } else {
            // Delete for me - remove from list
            return { ...m, _hidden: true } as any; 
          }
        }).filter(m => !(m as any)._hidden));
      }
    } catch (error) {
      console.error('Delete failed', error);
      alert('Failed to delete message');
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editInput.trim()) return;
    
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/messages/messages/${editingMessage._id}/edit`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newMessage: editInput })
      });

      if (res.ok) {
        const data = await res.json();
        // Optimistic update
        setMessages(prev => prev.map(m => 
          m._id === editingMessage._id ? { ...m, message: editInput, edited: true } : m
        ));
        setEditingMessage(null);
        setEditInput('');
      }
    } catch (error) {
      console.error('Edit failed', error);
      alert('Failed to edit message');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const token = getAuthToken();
      setReactingToMessageId(null); // Close picker immediately

      // Optimistic update
      setMessages(prev => prev.map(m => {
        if (m._id !== messageId) return m;
        
        // Clone reactions
        const currentReactions = [...(m.reactions || [])];
        const userId = doctorId; // Assuming doctorId is current user ID
        
        // Check if reaction exists
        const existingIdx = currentReactions.findIndex(r => {
          const rUserId = typeof r.user_id === 'object' ? r.user_id._id : r.user_id;
          return rUserId === userId && r.emoji === emoji;
        });

        if (existingIdx > -1) {
          // Remove
          currentReactions.splice(existingIdx, 1);
        } else {
          // Add
          currentReactions.push({
            user_id: { _id: userId, name: 'You' } as any, // Mock user object
            emoji
          });
        }

        return { ...m, reactions: currentReactions };
      }));

      await fetch(`${API_BASE_URL}/messages/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reaction: emoji })
      });
    } catch (error) {
      console.error('Reaction failed', error);
    }
  };

  // --- Socket Handlers ---

  const handleTyping = useCallback((data: any) => {
    if (!selectedConv || data.conversationId !== selectedConv._id) return;
    
    const { userId, isTyping } = data;
    
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      if (isTyping) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, [selectedConv]);

  const handleMessagesRead = useCallback((data: any) => {
    if (!selectedConv || data.conversationId !== selectedConv._id) return;
    setMessages(prev => prev.map(msg => 
      getSenderId(msg.sender_id) !== doctorId ? { ...msg, read: true } : msg
    ));
  }, [selectedConv, doctorId]);

  handlerRef.current = (rawMsg: any) => {
    if (!rawMsg) return;

    const convId = rawMsg.conversationId || rawMsg.conversation_id;
    
    // Skip if this is a pending message we already handled
    if (pendingMessageIds.current.has(rawMsg._id)) {
      pendingMessageIds.current.delete(rawMsg._id);
      return;
    }

    // Normalize incoming message
    const normalizedMsg: Message = {
      ...rawMsg,
      _id: rawMsg._id || `msg_${Date.now()}`,
      conversation_id: convId,
      message: rawMsg.message || '',
      message_type: (rawMsg.message_type as Message['message_type']) || 'text',
      media_url: rawMsg.media_url,
      timestamp: rawMsg.timestamp || new Date().toISOString(),
      reactions: rawMsg.reactions || []
    };

    const activeConv = selectedConvRef.current;

    // Update conversation list
    setConversations(prev => {
      const exists = prev.find(c => c._id === convId);
      if (exists) {
        return prev.map(c => c._id === convId ? {
          ...c,
          last_message: normalizedMsg,
          last_message_at: normalizedMsg.timestamp,
          unread_count: (activeConv?._id === convId) ? 0 : (c.unread_count || 0) + 1
        } : c).sort((a, b) => 
          new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
        );
      }
      return prev;
    });

    // If viewing this conversation, add message
    if (activeConv?._id === convId) {
      setMessages(prev => {
        if (prev.some(m => m._id === normalizedMsg._id)) return prev;

        const sId = getSenderId(normalizedMsg.sender_id);
        if (sId === doctorId) {
          const tempIdx = prev.findIndex(m => 
            m._id.startsWith('temp_') && m.message === normalizedMsg.message
          );
          if (tempIdx !== -1) {
            const newMsgs = [...prev];
            newMsgs[tempIdx] = normalizedMsg;
            return newMsgs;
          }
        }
        return [...prev, normalizedMsg];
      });
      markAsReadAPI(convId);
      setTimeout(scrollToBottom, 50);
    }
  };

  // --- Socket Connection ---

  const connectSocket = useCallback(() => {
    const token = getAuthToken();
    if (!token || socketRef.current) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected');
      setIsSocketConnected(true);
      if (selectedConvRef.current) {
        socket.emit('join_conversation', selectedConvRef.current._id);
      }
    });
    
    socket.on('disconnect', () => setIsSocketConnected(false));
    
    // Main message handler
    socket.on('new_message', (data: any) => handlerRef.current?.(data));

    // CRUD & Reaction Events
    socket.on('message_edited', (data: any) => {
      if (selectedConvRef.current?._id === data.conversationId) {
        setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, ...data.message } : m));
      }
    });

    socket.on('message_deleted', (data: any) => {
      if (selectedConvRef.current?._id === data.conversationId) {
        setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, deleted: true, message: 'This message was deleted', reactions: [] } : m));
      }
    });

    socket.on('reaction_added', (data: any) => {
        if (selectedConvRef.current?._id === data.conversationId) {
            setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, reactions: data.message.reactions } : m));
        }
    });

    socket.on('reaction_removed', (data: any) => {
        if (selectedConvRef.current?._id === data.conversationId) {
            setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, reactions: data.message.reactions } : m));
        }
    });

    socket.on('user_typing', handleTyping);
    socket.on('messages_read_by_user', handleMessagesRead);

    socket.on('message_sent_success', (response: any) => {
      if (response.messageId && response.tempId) {
        setMessages(prev => prev.map(m => m._id === response.tempId ? { ...m, _id: response.messageId } : m));
        pendingMessageIds.current.add(response.messageId);
      }
      if (response.tempId && pendingSocketMessages.current.has(response.tempId)) {
        const { resolve } = pendingSocketMessages.current.get(response.tempId)!;
        resolve(response);
        pendingSocketMessages.current.delete(response.tempId);
      }
    });

    socket.on('message_error', (error: any) => {
      if (error.tempId && pendingSocketMessages.current.has(error.tempId)) {
        const { reject } = pendingSocketMessages.current.get(error.tempId)!;
        reject(new Error(error.error || 'Socket message failed'));
        pendingSocketMessages.current.delete(error.tempId);
      }
    });

    return socket;
  }, [handleTyping, handleMessagesRead]);

  // --- API Calls (Fetch) ---

  const fetchConversations = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const mappedConversations = (data.data || []).map((c: any) => ({
            ...c,
            medical_record_id: c.medical_record_id
          }));
          setConversations(mappedConversations.sort((a: any, b: any) => 
            new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
          ));
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages(data.data || []);
          markAsReadAPI(conversationId);
          if (socketRef.current?.connected) {
            socketRef.current.emit('join_conversation', conversationId);
            socketRef.current.emit('messages_read', { conversationId });
          }
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (e) { console.error(e); } finally { setMessagesLoading(false); }
  }, [markAsReadAPI, scrollToBottom]);

  // --- Initialization ---

  useEffect(() => {
    if (!doctorId) { 
      redirectToLoginPage(); 
      return; 
    }
    fetchConversations();
    connectSocket();
  }, [doctorId, connectSocket, fetchConversations]);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv._id);
      setTypingUsers(new Set());
    }
  }, [selectedConv, fetchMessages]);

  useEffect(() => { 
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  // --- Input Handlers ---

  const handleTypingStart = useCallback(() => {
    if (!selectedConv || !socketRef.current?.connected) return;
    socketRef.current.emit('typing_start', { conversationId: selectedConv._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => handleTypingStop(), 3000);
  }, [selectedConv]);

  const handleTypingStop = useCallback(() => {
    if (!selectedConv || !socketRef.current?.connected) return;
    socketRef.current.emit('typing_stop', { conversationId: selectedConv._id });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [selectedConv]);

  const handleInputEmojiClick = (emojiData: EmojiClickData) => {
    setInput(prev => prev + emojiData.emoji);
    handleTypingStart();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    handleTypingStart();
  };

  // --- Send Logic ---

  const sendViaSocket = async (tempId: string, messageData: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      pendingSocketMessages.current.set(tempId, { resolve, reject });
      socketRef.current.emit('send_message', { ...messageData, tempId });
      setTimeout(() => {
        if (pendingSocketMessages.current.has(tempId)) {
          pendingSocketMessages.current.delete(tempId);
          reject(new Error('Socket timeout'));
        }
      }, 5000);
    });
  };

  const handleSendText = async () => {
    if (!input.trim() || !selectedConv || sending) return;
    
    const messageText = input.trim();
    const tempId = `temp_${Date.now()}`;
    
    const tempMsg: Message = {
      _id: tempId,
      conversation_id: selectedConv._id,
      sender_id: { _id: doctorId, name: 'You', role: 'doctor' },
      receiver_id: selectedConv.participant,
      message: messageText,
      message_type: 'text',
      read: false,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMsg]);
    setInput('');
    setShowInputEmojiPicker(false);
    handleTypingStop();
    setSending(true);
    setTimeout(scrollToBottom, 50);

    const messageData = {
      conversationId: selectedConv._id,
      receiverId: selectedConv.participant._id,
      message: messageText,
      messageType: 'text'
    };

    try {
      const result = await sendViaSocket(tempId, messageData);
      console.log('✅ Message sent via socket:', result);
    } catch (socketError) {
      console.warn('Socket failed, trying REST API:', socketError);
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE_URL}/messages/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            receiver_id: selectedConv.participant._id,
            message: messageText,
            message_type: 'text'
          })
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data?.message?._id) {
            setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: result.data.message._id } : m));
            pendingMessageIds.current.add(result.data.message._id);
          }
        }
      } catch (restError) {
        console.error('REST API also failed:', restError);
        setMessages(prev => prev.filter(m => m._id !== tempId));
        alert('Failed to send message.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv || sending) return;
    if (file.size > 10 * 1024 * 1024) { alert("File is too large (Max 10MB)"); return; }

    const isImage = file.type.startsWith('image/');
    const tempId = `temp_media_${Date.now()}`;
    const blobUrl = URL.createObjectURL(file);
    
    const tempMsg: Message = {
      _id: tempId,
      conversation_id: selectedConv._id,
      sender_id: { _id: doctorId, name: 'You', role: 'doctor' },
      receiver_id: selectedConv.participant,
      message: '',
      message_type: isImage ? 'image' : 'file',
      media_url: blobUrl,
      media_name: file.name,
      read: false,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMsg]);
    setTimeout(scrollToBottom, 50);
    setSending(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiver_id', selectedConv.participant._id);
    if (selectedConv.medical_record_id) formData.append('medical_record_id', selectedConv.medical_record_id.toString());
    
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/messages/send-with-media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?._id) {
          setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: data.data._id, media_url: data.data.media_url } : m));
          pendingMessageIds.current.add(data.data._id);
          URL.revokeObjectURL(blobUrl);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
      alert("Failed to send file");
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Sub Components ---

  const MessageBubble = ({ msg }: { msg: Message }) => {
    const isMe = getSenderId(msg.sender_id) === doctorId;
    const isDeleted = msg.deleted;
    const isHovered = hoveredMessageId === msg._id;

    // Group reactions
    const groupedReactions: { [key: string]: { count: number, reactedByMe: boolean } } = {};
    msg.reactions?.forEach(r => {
      if (!groupedReactions[r.emoji]) groupedReactions[r.emoji] = { count: 0, reactedByMe: false };
      groupedReactions[r.emoji].count++;
      const rUserId = typeof r.user_id === 'object' ? r.user_id._id : r.user_id;
      if (rUserId === doctorId) groupedReactions[r.emoji].reactedByMe = true;
    });

    return (
      <div 
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 md:mb-6 group relative`}
        onMouseEnter={() => setHoveredMessageId(msg._id)}
        onMouseLeave={() => setHoveredMessageId(null)}
      >
        <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
          
          {/* Action Menu (Desktop Hover / Mobile Click) */}
          {!isDeleted && (
            <div className={`absolute -top-8 ${isMe ? 'right-0' : 'left-0'} z-10 bg-white shadow-lg rounded-full px-2 py-1 flex gap-1 transition-opacity duration-200 border border-slate-100 ${isHovered || reactingToMessageId === msg._id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <ActionButton icon="add_reaction" onClick={() => setReactingToMessageId(msg._id)} />
              {isMe && msg.message_type === 'text' && (
                <ActionButton icon="edit" onClick={() => { setEditingMessage(msg); setEditInput(msg.message); }} />
              )}
              {(isMe) && (
                <ActionButton icon="delete" onClick={() => handleDeleteMessage(msg._id, 'everyone')} color="text-rose-400" hoverColor="hover:text-rose-600 hover:bg-rose-50" />
              )}
              {(!isMe) && (
                <ActionButton icon="delete" onClick={() => handleDeleteMessage(msg._id, 'me')} color="text-rose-400" hoverColor="hover:text-rose-600 hover:bg-rose-50" />
              )}
            </div>
          )}

          {/* Reaction Picker Popover */}
          {reactingToMessageId === msg._id && (
            <div ref={reactionPickerRef} className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} z-50 shadow-2xl rounded-2xl animate-fade-in-up`}>
              <EmojiPicker 
                onEmojiClick={(emojiData) => handleReaction(msg._id, emojiData.emoji)}
                width={300}
                height={350}
                searchDisabled={false}
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}

          {/* Bubble Content */}
          <div className={`shadow-sm transition-all relative ${
            msg.message_type === 'image' 
              ? 'rounded-2xl p-1 bg-white border border-slate-200' 
              : `px-4 py-3 md:px-6 md:py-4 rounded-[1.5rem] md:rounded-[2rem] ${
                  isDeleted ? 'bg-slate-100 text-slate-400 border border-slate-200 italic' :
                  isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                }`
          }`}>
            
            {/* Deleted Message */}
            {isDeleted && (
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-lg">block</span>
                <span>This message was deleted</span>
              </div>
            )}

            {/* Normal Content */}
            {!isDeleted && (
              <>
                {msg.message_type === 'text' && (
                  <div className="text-[14px] md:text-[15px] font-medium leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                    {msg.edited && <span className="text-[10px] opacity-60 ml-2 italic">(edited)</span>}
                  </div>
                )}

                {msg.message_type === 'image' && (
                  <div className="relative group cursor-pointer">
                    <img 
                      src={getMediaUrl(msg.media_url)} 
                      alt="Attachment" 
                      className="rounded-xl max-h-[250px] md:max-h-[300px] object-cover w-auto h-auto min-w-[120px] min-h-[120px] bg-slate-100"
                      loading="lazy"
                    />
                    <a href={getMediaUrl(msg.media_url)} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <span className="material-symbols-outlined text-white text-3xl">open_in_new</span>
                    </a>
                  </div>
                )}

                {msg.message_type === 'file' && (
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
                      <span className="material-symbols-outlined text-lg md:text-xl">description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-xs md:text-sm max-w-[120px] md:max-w-[150px]">{msg.media_name || 'File'}</p>
                      <a href={getMediaUrl(msg.media_url)} target="_blank" rel="noreferrer" className={`text-xs hover:underline ${isMe ? 'text-blue-100' : 'text-blue-600'}`}>
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Reactions Display */}
          {!isDeleted && msg.reactions && msg.reactions.length > 0 && (
            <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'} flex-wrap max-w-full px-2`}>
              {Object.entries(groupedReactions).map(([emoji, data]) => (
                <button 
                  key={emoji}
                  onClick={() => handleReaction(msg._id, emoji)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold border transition-colors ${data.reactedByMe ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <span>{emoji}</span>
                  <span>{data.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Meta Info */}
          <div className="mt-1 md:mt-2 text-[10px] font-black opacity-60 flex items-center gap-1 md:gap-2 px-1">
            {safeFormatTime(msg.timestamp)}
            {isMe && !isDeleted && <span className="material-symbols-outlined text-[12px] md:text-[14px]">{msg.read ? 'done_all' : 'done'}</span>}
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="flex h-screen h-[100dvh] bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans relative">
      
      {/* Edit Modal */}
      {editingMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-bold mb-4">Edit Message</h3>
            <input 
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingMessage(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancel</button>
              <button onClick={handleEditMessage} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Hidden on mobile if chat is selected */}
      <div className={`w-full md:w-80 lg:w-[400px] flex-col border-r border-slate-200 bg-white z-20 flex-shrink-0 ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
        {/* ... Sidebar Header ... */}
        <div className="p-6 md:p-8 pb-4">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Chats</h1>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all duration-300 ${isSocketConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-500 shadow-lg' : 'bg-rose-500 animate-pulse'}`}></span>
              {isSocketConnected ? 'Live' : 'Offline'}
            </div>
          </div>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input className="w-full pl-12 pr-4 py-3 md:py-4 rounded-2xl bg-slate-50 outline-none text-sm font-medium" placeholder="Search patients..." />
          </div>
        </div>

        {/* ... Conversation List ... */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 scrollbar-hide">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full opacity-40">
               <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">forum</span>
              <p className="text-slate-400 font-medium">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map(conv => {
                const isActive = selectedConv?._id === conv._id;
                return (
                  <div key={conv._id} onClick={() => setSelectedConv(conv)} className={`p-4 flex gap-4 cursor-pointer rounded-[2rem] md:rounded-[2.5rem] transition-all border-2 ${isActive ? 'bg-blue-600 border-blue-600 shadow-xl text-white' : 'hover:bg-slate-50 border-transparent'}`}>
                    <img src={getAvatarUrl(conv.participant?.avatar)} className="w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] md:rounded-[1.6rem] object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-black truncate text-[14px] md:text-[15px]">{conv.participant?.name}</h4>
                        <span className="text-[10px] font-bold opacity-70">{safeFormatTime(conv.last_message_at)}</span>
                      </div>
                      <p className="text-[12px] md:text-[13px] truncate opacity-80">{extractMessagePreview(conv.last_message)}</p>
                    </div>
                    {conv.unread_count > 0 && !isActive && (
                      <span className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex-col bg-white h-full relative overflow-hidden ${selectedConv ? 'flex fixed inset-0 z-50 md:static' : 'hidden md:flex'}`}>
        {selectedConv ? (
          <>
            {/* Header */}
            <header className="flex-none px-4 md:px-10 py-4 md:py-6 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur-xl z-30 shadow-sm md:shadow-none">
              <div className="flex items-center gap-3 md:gap-5">
                <button onClick={() => { setSelectedConv(null); setMessages([]); }} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="relative">
                  <img src={getAvatarUrl(selectedConv.participant?.avatar)} className="w-10 h-10 md:w-14 md:h-14 rounded-2xl md:rounded-3xl object-cover border-2 md:border-4 border-slate-50" alt="" />
                  <span className={`absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 border-[2px] md:border-[3px] border-white rounded-full ${isSocketConnected ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">{selectedConv.participant?.name}</h3>
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">P-{selectedConv._id.slice(-5).toUpperCase()}</p>
                </div>
              </div>
              {typingUsers.size > 0 && (
                <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 animate-pulse">
                  <span className="material-symbols-outlined text-sm md:text-base">edit</span>
                  <span className="hidden md:inline">Typing...</span>
                </div>
              )}
            </header>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto px-4 md:px-10 pt-4 md:pt-8 pb-4 bg-slate-50/30 scroll-smooth">
              {messagesLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <span className="material-symbols-outlined text-5xl md:text-6xl text-slate-300 mb-4">chat_bubble</span>
                  <h3 className="text-lg md:text-xl font-bold text-slate-400 mb-2">No messages yet</h3>
                  <p className="text-sm md:text-base text-slate-400">Start the conversation by sending a message</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg, idx) => (
                    <MessageBubble key={msg._id || idx} msg={msg} />
                  ))}
                  
                  {typingUsers.size > 0 && (
                    <div className="flex justify-start mb-6">
                      <div className="max-w-[75%] lg:max-w-[60%]">
                        <div className="px-4 py-3 md:px-6 md:py-4 rounded-[2rem] bg-white text-slate-700 rounded-bl-none border border-slate-100">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-px w-full" />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex-none bg-white border-t border-slate-50 px-3 md:px-10 pt-3 pb-4 md:pb-8 z-20 safe-area-bottom">
              <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-3 bg-slate-50 md:bg-white md:border border-slate-200/80 rounded-3xl md:rounded-[2.5rem] p-2 md:p-3 md:shadow-xl transition-all relative">
                
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileSelect} />

                <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center hover:bg-slate-200 md:hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0" disabled={sending}>
                  <span className="material-symbols-outlined text-xl md:text-2xl">attach_file</span>
                </button>

                <div className="relative" ref={emojiRef}>
                  <button onClick={() => setShowInputEmojiPicker(!showInputEmojiPicker)} className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center hover:bg-slate-200 md:hover:bg-slate-100 transition-colors flex-shrink-0 ${showInputEmojiPicker ? 'text-yellow-500 bg-yellow-50' : 'text-slate-400 hover:text-yellow-500'}`} disabled={sending}>
                    <span className="material-symbols-outlined text-xl md:text-2xl">sentiment_satisfied</span>
                  </button>
                  
                  {showInputEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-4 z-50 shadow-2xl rounded-2xl border border-slate-100 animate-fade-in-up">
                      <EmojiPicker onEmojiClick={handleInputEmojiClick} width={300} height={400} searchDisabled={false} previewConfig={{ showPreview: false }} />
                    </div>
                  )}
                </div>

                <input 
                  value={input} 
                  onChange={handleInputChange}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                  onBlur={handleTypingStop}
                  placeholder="Type message..." 
                  className="flex-1 bg-transparent border-none px-2 py-3 md:py-4 outline-none font-medium text-[15px] md:text-[15px]" 
                  disabled={sending}
                />
                
                <button onClick={handleSendText} disabled={!input.trim() || sending} className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${input.trim() ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95' : 'bg-slate-200 md:bg-slate-100 text-slate-300'}`}>
                  {sending ? <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined font-bold text-lg md:text-xl">send</span>}
                </button>
              </div>
              
              <div className="mt-2 md:mt-3 text-center">
                <div className="inline-flex items-center gap-2 text-[10px] md:text-xs text-slate-400 font-medium">
                  {sending ? <><div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full animate-pulse"></div><span>Sending...</span></> : !isSocketConnected && <><div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-rose-500 rounded-full animate-pulse"></div><span>Disconnected - Using fallback</span></>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-20 text-center select-none">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-50 rounded-[2.5rem] md:rounded-[3rem] flex items-center justify-center mb-6 md:mb-8 shadow-inner animate-pulse-slow">
               <span className="material-symbols-outlined text-5xl md:text-6xl text-blue-600/20">chat_bubble</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 mb-3 md:mb-4 tracking-tight">MediCare Messaging</h2>
            <p className="text-sm md:text-lg font-bold text-slate-400 max-w-xs md:max-w-none mx-auto">Select a verified patient to start consultation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;