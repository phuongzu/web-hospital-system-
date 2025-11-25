import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message } from '../types';
import { API_BASE_URL, getAuthToken, getDoctorId } from '../utils/api';

const Messages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const doctorId = getDoctorId();

  // Fetch Conversations
  useEffect(() => {
    const fetchConvs = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE_URL}/messages/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) setConversations(data.data || []);
      } catch(e) { console.error(e); }
    };
    fetchConvs();
    const interval = setInterval(fetchConvs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Messages
  useEffect(() => {
    if(!selectedConv) return;
    const fetchMsgs = async () => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/messages/conversations/${selectedConv._id}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if(data.success) setMessages(data.data || []);
        } catch(e) { console.error(e); }
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000);
    return () => clearInterval(interval);
  }, [selectedConv]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
      if(!input.trim() || !selectedConv) return;
      try {
        const token = getAuthToken();
        await fetch(`${API_BASE_URL}/messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                receiver_id: selectedConv.participant._id,
                message: input,
                message_type: 'text'
            })
        });
        setInput('');
        // Refresh messages immediately
        const res = await fetch(`${API_BASE_URL}/messages/conversations/${selectedConv._id}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) setMessages(data.data || []);
      } catch(e) { console.error(e); }
  };

  return (
    <div className="flex h-screen max-h-screen bg-background-light dark:bg-background-dark">
      {/* Left List */}
      <div className="w-80 md:w-96 flex flex-col border-r border-gray-200 dark:border-[#224449] bg-white dark:bg-[#102023]">
        <div className="p-4 border-b border-gray-200 dark:border-[#224449]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Messages</h2>
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                <input className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-[#1a2c2f] border-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-1 focus:ring-primary" placeholder="Search..." />
            </div>
        </div>
        <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
                <div 
                    key={conv._id}
                    onClick={() => setSelectedConv(conv)}
                    className={`p-4 flex gap-3 cursor-pointer transition-colors ${selectedConv?._id === conv._id ? 'bg-primary/5 dark:bg-primary/10 border-r-2 border-primary' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                    <div className="relative size-12">
                        <div className="size-12 rounded-full bg-cover bg-center bg-gray-200" style={{backgroundImage: `url('${conv.participant.avatar || ''}')`}}>
                            {!conv.participant.avatar && <span className="flex items-center justify-center h-full text-gray-500">{conv.participant.name[0]}</span>}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">{conv.participant.name}</h4>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.last_message?.message || 'No messages'}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white/50 dark:bg-[#0f2023] h-full">
         {selectedConv ? (
             <>
                <header className="p-4 border-b border-gray-200 dark:border-[#224449] bg-white dark:bg-[#102023] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-cover bg-center bg-gray-200" style={{backgroundImage: `url('${selectedConv.participant.avatar || ''}')`}}></div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{selectedConv.participant.name}</h3>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map(msg => {
                        const isMe = msg.sender_id._id === doctorId;
                        return (
                            <div key={msg._id} className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto justify-end' : ''}`}>
                                {!isMe && <div className="size-8 rounded-full bg-cover bg-center shrink-0 mt-auto bg-gray-200" style={{backgroundImage: `url('${selectedConv.participant.avatar || ''}')`}}></div>}
                                <div className={`${isMe ? 'bg-primary text-white' : 'bg-white dark:bg-[#1a2c2f] text-gray-800 dark:text-gray-200'} p-3 rounded-2xl shadow-sm ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                                    <p className="text-sm">{msg.message}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/80' : 'text-gray-400'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white dark:bg-[#102023] border-t border-gray-200 dark:border-[#224449]">
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..." 
                            className="flex-1 bg-gray-100 dark:bg-[#1a2c2f] border-none rounded-full px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-primary"
                        />
                        <button onClick={handleSend} className="bg-primary hover:bg-primary/90 text-white p-2.5 rounded-full shadow-md transition-all hover:scale-105">
                            <span className="material-symbols-outlined text-xl leading-none">send</span>
                        </button>
                    </div>
                </div>
             </>
         ) : (
             <div className="flex flex-col items-center justify-center h-full text-gray-500">
                 <span className="material-symbols-outlined text-6xl mb-4">chat</span>
                 <p>Select a conversation to start messaging</p>
             </div>
         )}
      </div>
    </div>
  );
};

export default Messages;