
import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { Conversation, Message } from '../types';
import { API_BASE_URL, SOCKET_URL, getAuthToken, getDoctorId, getAvatarUrl, redirectToLoginPage } from '../utils/api';

const Messages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const selectedConvRef = useRef<Conversation | null>(null);
  const handlerRef = useRef<any>(null);
  const doctorId = getDoctorId();

  useEffect(() => {
    selectedConvRef.current = selectedConv;
  }, [selectedConv]);

  const safeFormatTime = useCallback((dateStr?: string | number | Date): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const extractMessageText = useCallback((m: any): string => {
    if (!m) return '';
    if (typeof m === 'string') return m;
    const text = m.message || m.content || m.text || m.body || m.msg || m.message_text || '';
    return typeof text === 'string' ? text.trim() : JSON.stringify(text).trim();
  }, []);

  const getSenderId = (sender: any): string => {
    if (!sender) return '';
    return typeof sender === 'object' ? sender._id : sender;
  };

  const markAsReadAPI = useCallback(async (conversationId: string) => {
    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { console.error('Read error:', e); }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      // Messenger effect: Wait for DOM updates
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, []);

  handlerRef.current = (rawMsg: any) => {
    if (!rawMsg) return;

    const convId = rawMsg.conversationId || rawMsg.conversation_id;
    const normalizedMsg: Message = {
      ...rawMsg,
      conversation_id: convId,
      message: extractMessageText(rawMsg),
      timestamp: rawMsg.timestamp || new Date().toISOString()
    };

    const activeConv = selectedConvRef.current;

    setConversations(prev => {
      const exists = prev.find(c => c._id === convId);
      let updatedList = [...prev];

      if (exists) {
        updatedList = prev.map(c => c._id === convId ? {
          ...c,
          last_message: normalizedMsg,
          last_message_at: normalizedMsg.timestamp,
          unread_count: (activeConv?._id === convId) ? 0 : (c.unread_count || 0) + 1
        } : c);
      }
      
      return updatedList.sort((a, b) => 
        new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
      );
    });

    if (activeConv?._id === convId) {
      setMessages(prev => {
        if (prev.some(m => m._id === normalizedMsg._id)) return prev;

        const sId = getSenderId(normalizedMsg.sender_id);
        if (sId === doctorId) {
          const tempIdx = prev.findIndex(m => 
            m._id.startsWith('temp_') && extractMessageText(m) === normalizedMsg.message
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

  const fetchConversations = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConversations((data.data || []).map((c: any) => ({
            ...c,
            last_message: c.last_message ? { ...c.last_message, message: extractMessageText(c.last_message) } : undefined
          })).sort((a: any, b: any) => 
            new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
          ));
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [extractMessageText]);

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
          setMessages((data.data || []).map((m: any) => ({ ...m, message: extractMessageText(m) })));
          markAsReadAPI(conversationId);
          if (socketRef.current?.connected) socketRef.current.emit('mark_as_read', { conversationId });
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (e) { console.error(e); } finally { setMessagesLoading(false); }
  }, [extractMessageText, markAsReadAPI, scrollToBottom]);

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

  const handleSend = async () => {
    if (!input.trim() || !selectedConv || sending) return;
    const messageText = input.trim();
    setInput('');
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const tempMsg: any = {
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

  useEffect(() => { 
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans">
      {/* Sidebar */}
      <div className="w-80 lg:w-[400px] flex flex-col border-r border-slate-200 bg-white z-20">
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
                      <p className="text-[13px] truncate opacity-80">{extractMessageText(conv.last_message) || 'No messages'}</p>
                    </div>
                    {conv.unread_count > 0 && <span className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">{conv.unread_count}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white relative">
        {selectedConv ? (
          <>
            <header className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-xl sticky top-0 z-30">
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

            {/* FIX: Tăng pb-28 lên pb-40 để tin nhắn cuối cùng không bị che bởi input nổi */}
            <div className="flex-1 overflow-y-auto px-10 pt-10 pb-40 space-y-8 bg-slate-50/30 scroll-smooth">
              {messagesLoading ? (
                <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
              ) : (
                messages.map((msg, idx) => {
                  const sId = getSenderId(msg.sender_id);
                  const isMe = sId === doctorId;
                  return (
                    <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in-down`}>
                      <div className={`max-w-[75%] px-6 py-4 rounded-[2rem] shadow-sm transition-all hover:shadow-md ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'}`}>
                        <div className="text-[15px] font-medium leading-relaxed">{extractMessageText(msg)}</div>
                        <div className="mt-2 text-[10px] font-black opacity-60 flex items-center gap-2">
                          {safeFormatTime(msg.timestamp)}
                          {isMe && <span className="material-symbols-outlined text-[14px]">{msg.read ? 'done_all' : 'done'}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Điểm neo để cuộn xuống cuối */}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            <div className="absolute bottom-8 left-0 right-0 px-10 pointer-events-none">
              <div className="max-w-4xl mx-auto flex items-center gap-4 bg-white/95 backdrop-blur-2xl border border-slate-200/50 rounded-[2.5rem] p-3 shadow-2xl pointer-events-auto">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type clinical instructions..." className="flex-1 bg-transparent border-none px-4 py-4 outline-none font-medium text-[15px]" />
                <button onClick={handleSend} disabled={!input.trim() || sending} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${input.trim() ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-300'}`}>
                   {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined font-bold">send</span>}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center select-none">
            <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-8 shadow-inner">
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
