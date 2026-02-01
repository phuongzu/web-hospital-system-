import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Conversation as BaseConversation, Message as BaseMessage } from '../types';
import { API_BASE_URL, SOCKET_URL, getAuthToken, getDoctorId, getAvatarUrl, redirectToLoginPage } from '../utils/api';

// Local type extensions to fix missing properties in original types
interface Conversation extends BaseConversation {
  medical_record_id?: string | any;
}

interface Message extends BaseMessage {
  media_url?: string;
  media_name?: string;
}

const Messages: React.FC = () => {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const selectedConvRef = useRef<Conversation | null>(null);
  const handlerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const doctorId = getDoctorId();

  // --- Effects ---

  useEffect(() => {
    selectedConvRef.current = selectedConv;
  }, [selectedConv]);

  // Handle click outside emoji picker to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    if (m.message_type === 'image') return '📷 Image';
    if (m.message_type === 'file') return '📎 Attachment';
    
    // Fallback for potentially weird types
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

  // --- Socket Logic ---

  handlerRef.current = (rawMsg: any) => {
    if (!rawMsg) return;

    const convId = rawMsg.conversationId || rawMsg.conversation_id;
    // Normalize incoming message
    const normalizedMsg: Message = {
      ...rawMsg,
      _id: rawMsg._id || `msg_${Date.now()}`,
      conversation_id: convId,
      message: rawMsg.message || '',
      message_type: (rawMsg.message_type as Message['message_type']) || 'text',
      media_url: rawMsg.media_url,
      timestamp: rawMsg.timestamp || new Date().toISOString()
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
        // De-duplicate based on ID or temp ID for images
        if (prev.some(m => m._id === normalizedMsg._id)) return prev;

        // If it's a message sent by me, replace the optimistic one
        const sId = getSenderId(normalizedMsg.sender_id);
        if (sId === doctorId) {
          // Find optimistic text message
          if (normalizedMsg.message_type === 'text') {
             const tempIdx = prev.findIndex(m => m._id.startsWith('temp_') && m.message === normalizedMsg.message);
             if (tempIdx !== -1) {
               const newMsgs = [...prev];
               newMsgs[tempIdx] = normalizedMsg;
               return newMsgs;
             }
          }
        }
        return [...prev, normalizedMsg];
      });
      
      markAsReadAPI(convId);
      setTimeout(scrollToBottom, 50);
    }
  };

  const connectSocket = useCallback(() => {
    const token = getAuthToken();
    if (!token || socketRef.current) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true
    });
    socketRef.current = socket;

    socket.on('connect', () => setIsSocketConnected(true));
    socket.on('disconnect', () => setIsSocketConnected(false));
    socket.on('new_message', (data: any) => handlerRef.current?.(data));
    socket.on('receive_message', (data: any) => handlerRef.current?.(data.message || data));
    socket.on('message_sent', (data: any) => {
      if (data.success) handlerRef.current?.(data.message);
    });
    socket.on('message_error', (err: any) => console.error('Socket Error:', err));
  }, []);

  // --- API Calls ---

  const fetchConversations = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Map backend data to local ExtendedConversation type
          const mappedConversations = (data.data || []).map((c: any) => ({
            ...c,
            // ensure medical_record_id is present if it's in the data
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
          if (socketRef.current?.connected) socketRef.current.emit('mark_as_read', { conversationId });
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (e) { console.error(e); } finally { setMessagesLoading(false); }
  }, [markAsReadAPI, scrollToBottom]);

  useEffect(() => {
    if (!doctorId) { redirectToLoginPage(); return; }
    fetchConversations();
    connectSocket();
    return () => { 
      socketRef.current?.disconnect(); 
      socketRef.current = null;
    };
  }, [doctorId, connectSocket, fetchConversations]);

  useEffect(() => {
    if (selectedConv) fetchMessages(selectedConv._id);
  }, [selectedConv, fetchMessages]);

  useEffect(() => { 
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  // --- Actions ---

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInput(prev => prev + emojiData.emoji);
  };

  const handleSendText = async () => {
    if (!input.trim() || !selectedConv || sending) return;
    const messageText = input.trim();
    setInput('');
    setShowEmojiPicker(false);
    setSending(true);

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
    setTimeout(scrollToBottom, 50);

    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', {
        conversationId: selectedConv._id,
        receiverId: selectedConv.participant._id,
        message: messageText,
        messageType: 'text'
      });
      setSending(false);
    } else {
      // Fallback REST
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE_URL}/messages/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ receiver_id: selectedConv.participant._id, message: messageText, message_type: 'text' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) handlerRef.current?.(data.data.message || data.data);
        }
      } catch (err) { 
        console.error(err);
        setMessages(prev => prev.filter(m => m._id !== tempId));
      } finally { setSending(false); }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    
    // Check constraints (e.g. 10MB limit is handled by backend, but good to check here)
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large (Max 10MB)");
      return;
    }

    const isImage = file.type.startsWith('image/');
    
    // 1. Optimistic Update
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

    // 2. Upload via API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiver_id', selectedConv.participant._id);
    if (selectedConv.medical_record_id) formData.append('medical_record_id', selectedConv.medical_record_id.toString());
    
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/messages/send-with-media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // Content-Type header is auto-set by browser with boundary for FormData
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Success: The socket will likely broadcast the real message back to us.
          // Or we can manually replace the temp message if the socket is laggy.
          const realMsg = data.data;
          setMessages(prev => prev.map(m => m._id === tempId ? realMsg : m));
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      // Remove optimistic message on fail
      setMessages(prev => prev.filter(m => m._id !== tempId));
      alert("Failed to send image");
    } finally {
      setSending(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // --- Render Components ---

  const MessageBubble = ({ msg, isMe }: { msg: Message, isMe: boolean }) => {
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in-down mb-6`}>
        <div className={`max-w-[75%] lg:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          
          <div className={`shadow-sm transition-all hover:shadow-md overflow-hidden ${
            msg.message_type === 'image' 
              ? 'rounded-2xl p-1 bg-white border border-slate-200' 
              : `px-6 py-4 rounded-[2rem] ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'}`
          }`}>
            
            {/* --- Text Message --- */}
            {msg.message_type === 'text' && (
              <div className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</div>
            )}

            {/* --- Image Message --- */}
            {msg.message_type === 'image' && (
              <div className="relative group cursor-pointer">
                <img 
                  src={getMediaUrl(msg.media_url)} 
                  alt="Attachment" 
                  className="rounded-xl max-h-[300px] object-cover w-auto h-auto min-w-[150px] min-h-[150px] bg-slate-100"
                  loading="lazy"
                />
                <a href={getMediaUrl(msg.media_url)} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <span className="material-symbols-outlined text-white text-3xl">open_in_new</span>
                </a>
              </div>
            )}

            {/* --- File Message --- */}
            {msg.message_type === 'file' && (
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
                  <span className="material-symbols-outlined">description</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-sm max-w-[150px]">{msg.media_name || 'File'}</p>
                  <a href={getMediaUrl(msg.media_url)} target="_blank" rel="noreferrer" className={`text-xs hover:underline ${isMe ? 'text-blue-100' : 'text-blue-600'}`}>
                    Download
                  </a>
                </div>
              </div>
            )}

          </div>

          <div className="mt-2 text-[10px] font-black opacity-60 flex items-center gap-2 px-1">
            {safeFormatTime(msg.timestamp)}
            {isMe && <span className="material-symbols-outlined text-[14px]">{msg.read ? 'done_all' : 'done'}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans">
      
      {/* --- Sidebar --- */}
      <div className="w-80 lg:w-[400px] flex flex-col border-r border-slate-200 bg-white z-20 flex-shrink-0">
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Chats</h1>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all duration-300 ${isSocketConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-500 shadow-lg' : 'bg-rose-500 animate-pulse'}`}></span>
              {isSocketConnected ? 'Live' : 'Offline'}
            </div>
          </div>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 outline-none text-sm font-medium" placeholder="Search patients..." />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 scrollbar-hide">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full opacity-40"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="space-y-1">
              {conversations.map(conv => {
                const isActive = selectedConv?._id === conv._id;
                return (
                  <div key={conv._id} onClick={() => setSelectedConv(conv)} className={`p-4 flex gap-4 cursor-pointer rounded-[2.5rem] transition-all border-2 ${isActive ? 'bg-blue-600 border-blue-600 shadow-xl text-white' : 'hover:bg-slate-50 border-transparent'}`}>
                    <img src={getAvatarUrl(conv.participant?.avatar)} className="w-14 h-14 rounded-[1.6rem] object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-black truncate text-[15px]">{conv.participant?.name}</h4>
                        <span className="text-[10px] font-bold opacity-70">{safeFormatTime(conv.last_message_at)}</span>
                      </div>
                      <p className="text-[13px] truncate opacity-80">{extractMessagePreview(conv.last_message)}</p>
                    </div>
                    {conv.unread_count > 0 && <span className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">{conv.unread_count}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- Main Chat Area --- */}
      <div className="flex-1 flex flex-col bg-white h-full relative overflow-hidden">
        {selectedConv ? (
          <>
            {/* Header */}
            <header className="flex-none px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur-xl z-30">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <img src={getAvatarUrl(selectedConv.participant?.avatar)} className="w-14 h-14 rounded-3xl object-cover border-4 border-slate-50" alt="" />
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 border-[3px] border-white rounded-full ${isSocketConnected ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedConv.participant?.name}</h3>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">P-{selectedConv._id.slice(-5).toUpperCase()}</p>
                </div>
              </div>
            </header>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto px-10 pt-8 pb-4 bg-slate-50/30 scroll-smooth">
              {messagesLoading ? (
                <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg, idx) => (
                    <MessageBubble key={msg._id || idx} msg={msg} isMe={getSenderId(msg.sender_id) === doctorId} />
                  ))}
                  <div ref={messagesEndRef} className="h-px w-full" />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex-none bg-white border-t border-slate-50 px-10 pt-4 pb-8 z-20">
              <div className="max-w-4xl mx-auto flex items-center gap-3 bg-white border border-slate-200/80 rounded-[2.5rem] p-3 shadow-xl transition-all hover:shadow-2xl relative">
                
                {/* File Input (Hidden) */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />

                {/* Attachment Button */}
                <button 
                  onClick={triggerFileUpload} 
                  className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                  title="Attach file or image"
                >
                  <span className="material-symbols-outlined">attach_file</span>
                </button>

                {/* Emoji Button & Picker Container */}
                <div className="relative" ref={emojiRef}>
                   <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                    className={`w-12 h-12 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors flex-shrink-0 ${showEmojiPicker ? 'text-yellow-500 bg-yellow-50' : 'text-slate-400 hover:text-yellow-500'}`}
                   >
                    <span className="material-symbols-outlined">sentiment_satisfied</span>
                  </button>
                  
                  {/* Popover Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-4 z-50 shadow-2xl rounded-2xl border border-slate-100 animate-fade-in-up">
                      <EmojiPicker 
                        onEmojiClick={handleEmojiClick}
                        width={300}
                        height={400}
                        searchDisabled={false}
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  )}
                </div>

                {/* Text Input */}
                <input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()} 
                  placeholder="Type clinical instructions..." 
                  className="flex-1 bg-transparent border-none px-2 py-4 outline-none font-medium text-[15px]" 
                />
                
                {/* Send Button */}
                <button 
                  onClick={handleSendText} 
                  disabled={!input.trim() || sending} 
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${input.trim() ? 'bg-blue-600 text-white shadow-lg scale-100' : 'bg-slate-100 text-slate-300 scale-95'}`}
                >
                   {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined font-bold">send</span>}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center select-none">
            <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-8 shadow-inner animate-pulse-slow">
               <span className="material-symbols-outlined text-6xl text-blue-600/20">chat_bubble</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">MediCare Messaging</h2>
            <p className="text-lg font-bold text-slate-400">Select a verified patient to start consultation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;