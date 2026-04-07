import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { type Socket } from 'socket.io-client';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  API_BASE_URL,
  SOCKET_URL,
  getAuthToken,
  getDoctorId,
  getAvatarUrl,
  redirectToLoginPage,
  isValidObjectId,
} from '../utils/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface User {
  _id: string;
  name: string;
  avatar?: string;
  role?: string;
  phoneNumber?: string;
  email?: string;
}

interface Reaction {
  user_id: User | string;
  emoji: string;
  createdAt?: string;
}

interface Message {
  _id: string;
  conversation_id?: string;
  sender_id: User | string;
  receiver_id: User | string;
  message: string;
  message_type: 'text' | 'image' | 'file';
  media_url?: string;
  media_name?: string;
  read?: boolean;
  timestamp?: string | number | Date;
  createdAt?: string;
  edited?: boolean;
  deleted?: boolean;
  deleted_for_me?: boolean;
  reactions?: Reaction[];
  reactions_count?: number;
  _temp?: boolean;
  _failed?: boolean;
}

interface Conversation {
  _id: string;
  participant: User;
  last_message?: Message;
  last_message_at?: string | number | Date;
  unread_count: number;
  medical_record_id?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAX_RETRY_COUNT = 2;
const TYPING_TIMEOUT = 2000;
const SOCKET_RECONNECTION_ATTEMPTS = 5;
const SOCKET_RECONNECTION_DELAY = 1000;

const isPhoneLike = (input: string) => {
  const stripped = input.trim().replace(/[\s.-]/g, '');
  return /^(\+84|0)[0-9]{7,}$/.test(stripped) || /^[0-9]{9,11}$/.test(stripped);
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getSenderId = (sender: any): string => {
  if (!sender) return '';
  return typeof sender === 'object' ? sender._id : sender;
};

const getMediaUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

const getAvatarColor = (name: string) => {
  const palette = [
    'from-sky-100 to-sky-200 text-sky-700',
    'from-violet-100 to-violet-200 text-violet-700',
    'from-emerald-100 to-emerald-200 text-emerald-700',
    'from-amber-100 to-amber-200 text-amber-700',
    'from-rose-100 to-rose-200 text-rose-700',
    'from-indigo-100 to-indigo-200 text-indigo-700',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

// ─── Components ─────────────────────────────────────────────────────────────────

const ActionButton = ({ icon, onClick, color = 'text-slate-400', hoverColor = 'hover:text-primary', title }: any) => (
  <button
    title={title}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#1a2c2f] transition-colors ${color} ${hoverColor}`}
  >
    <span className="material-symbols-outlined text-[18px]">{icon}</span>
  </button>
);

const Avatar: React.FC<{ user?: User | null; size?: 'sm' | 'md' | 'lg' }> = ({ user, size = 'md' }) => {
  const dim = size === 'lg' ? 'size-14' : size === 'md' ? 'size-12' : 'size-9';
  const text = size === 'lg' ? 'text-lg' : size === 'md' ? 'text-sm' : 'text-xs';
  const url = getAvatarUrl(user?.avatar);
  const hasAvatar = user?.avatar && user.avatar !== 'undefined' && user.avatar !== 'null';

  return (
    <div className={`${dim} rounded-2xl overflow-hidden shrink-0`}>
      {hasAvatar ? (
        <img src={url} alt={user?.name} className="size-full object-cover" />
      ) : (
        <div className={`size-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(user?.name || '')}`}>
          <span className={`${text} font-bold`}>
            {(user?.name || '?').charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Messages: React.FC = () => {
  const doctorId = getDoctorId();

  // ── Auth State ──────────────────────────────────────────────────────────────
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Core State ──────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // ── UI State ────────────────────────────────────────────────────────────────
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState('');
  const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null);

  // ── Phone Search State ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not-found' | 'error'>('idle');
  const [startingConv, setStartingConv] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedConvRef = useRef<Conversation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<Map<string, { message: Message; data: any; retries: number }>>(new Map());
  const pendingMessagesRef = useRef<Set<string>>(new Set());
  const deletingMessagesRef = useRef<Set<string>>(new Set());
  const [deletingMessages, setDeletingMessages] = useState<Set<string>>(new Set());
  // ── Event Handler Refs (to avoid stale closures) ───────────────────────────
  const handleNewMessageRef = useRef<(data: any) => void>(() => { });
  const handleTypingSocketRef = useRef<(data: any) => void>(() => { });
  const handleMessagesReadRef = useRef<(data: any) => void>(() => { });

  // ─── Authentication Check ───────────────────────────────────────────────────

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      const id = getDoctorId();

      console.log('🔐 Authentication check:', {
        hasToken: !!token,
        tokenValue: token ? `${token.substring(0, 20)}...` : 'none',
        doctorId: id,
        isValidId: id ? isValidObjectId(id) : false,
      });

      // Kiểm tra token
      if (!token) {
        setAuthError('No authentication token found. Please login again.');
        setTimeout(() => redirectToLoginPage(), 2000);
        setAuthChecked(true);
        return;
      }

      // Kiểm tra doctor ID
      if (!id) {
        setAuthError('No doctor ID found. Please login again.');
        setTimeout(() => redirectToLoginPage(), 2000);
        setAuthChecked(true);
        return;
      }

      // Kiểm tra format ObjectId
      if (!isValidObjectId(id)) {
        setAuthError(`Invalid doctor ID format. Please contact support.`);
        setTimeout(() => redirectToLoginPage(), 2000);
        setAuthChecked(true);
        return;
      }

      setAuthChecked(true);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    selectedConvRef.current = selectedConv;
  }, [selectedConv]);

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      deletingMessagesRef.current.clear();
    };
  }, []);


  // ─── Click Outside Handlers ─────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowInputEmojiPicker(false);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setReactingToMessageId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Scroll Helpers ─────────────────────────────────────────────────────────

  const debouncedScrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      scrollTimeoutRef.current = null;
    }, 100);
  }, []);

  // ─── API Calls ──────────────────────────────────────────────────────────────

  const markAsReadAPI = useCallback(async (conversationId: string) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, []);

  const safeFormatTime = useCallback((dateStr?: string | number | Date): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const getPreviewText = useCallback((msg?: Message): string => {
    if (!msg) return '';
    if (msg.deleted_for_me) return 'This message was deleted';
    if (msg.deleted) return 'Message deleted';
    if (msg.message_type === 'image') return '📷 Photo';
    if (msg.message_type === 'file') return '📎 Attachment';
    if (msg.message_type === 'text') {
      const text = msg.message || '';
      return text.length > 30 ? text.substring(0, 30) + '...' : text;
    }
    return '';
  }, []);

  const getPreviewMessage = useCallback((originalMsg?: Message): Message | undefined => {
    if (!originalMsg) return undefined;
    if (originalMsg.deleted_for_me) {
      return {
        ...originalMsg,
        message: 'This message was deleted',
        message_type: 'text',
      } as Message;
    }
    return originalMsg;
  }, []);

  // ─── Update Conversation Last Message ───────────────────────────────────────

  const updateConversationLastMessage = useCallback((conversationId: string, message: Message) => {
    setConversations(prev =>
      prev
        .map(c => {
          if (c._id !== conversationId) return c;
          const previewMessage = getPreviewMessage(message);
          return {
            ...c,
            last_message: previewMessage || message,
            last_message_at: message.timestamp || message.createdAt || new Date().toISOString(),
          };
        })
        .sort(
          (a, b) =>
            new Date(b.last_message_at || 0).getTime() -
            new Date(a.last_message_at || 0).getTime()
        )
    );
  }, [getPreviewMessage]);

  // ─── Fetch Conversations ────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        redirectToLoginPage();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        redirectToLoginPage();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const transformedConvs = (data.data || []).map((conv: Conversation) => {
            if (conv.last_message && conv.last_message.deleted_for_me) {
              return {
                ...conv,
                last_message: {
                  ...conv.last_message,
                  message: 'This message was deleted',
                  message_type: 'text',
                } as Message,
              };
            }
            return conv;
          });
          setConversations(
            transformedConvs.sort(
              (a: any, b: any) =>
                new Date(b.last_message_at || 0).getTime() -
                new Date(a.last_message_at || 0).getTime()
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch Messages ─────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        redirectToLoginPage();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/messages/conversations/${conversationId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 401) {
        redirectToLoginPage();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const transformedMessages = (data.data || []).map((msg: any) => {
            const isDeletedForMe = msg.deleted_for?.includes(doctorId);
            if (isDeletedForMe && !msg.deleted) {
              return {
                ...msg,
                deleted_for_me: true,
                message: 'This message was deleted',
                message_type: 'text',
                reactions: [],
              };
            }
            return msg;
          });
          setMessages(transformedMessages);

          if (transformedMessages.length > 0) {
            const lastMsg = transformedMessages[transformedMessages.length - 1];
            updateConversationLastMessage(conversationId, lastMsg);
          }

          await markAsReadAPI(conversationId);

          if (socketRef.current?.connected) {
            socketRef.current.emit('join_conversation', conversationId);
            socketRef.current.emit('messages_read', { conversationId });
          }
          debouncedScrollToBottom();
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, [doctorId, markAsReadAPI, debouncedScrollToBottom, updateConversationLastMessage]);

  // ─── Socket Message Queue ───────────────────────────────────────────────────

  const sendViaSocket = (tempId: string, data: any): Promise<any> =>
    new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      socketRef.current.timeout(5000).emit('send_message', { ...data, tempId }, (err: any, res: any) => {
        if (err || !res?.success) {
          reject(new Error(err?.message || res?.error || 'Failed to send'));
        } else {
          resolve(res);
        }
      });
    });

  const processQueue = useCallback(async () => {
    if (!messageQueueRef.current.size || !socketRef.current?.connected) return;

    for (const [tempId, { message, data, retries }] of Array.from(messageQueueRef.current.entries())) {
      if (retries >= MAX_RETRY_COUNT) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _failed: true } : m));
        messageQueueRef.current.delete(tempId);
        continue;
      }
      try {
        const result = await sendViaSocket(tempId, data);
        if (result) {
          setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: result.messageId, _temp: false } : m));
          messageQueueRef.current.delete(tempId);
        }
      } catch (error) {
        console.error(`Failed to send message ${tempId}, retry ${retries + 1}/${MAX_RETRY_COUNT}`);
        messageQueueRef.current.set(tempId, { message, data, retries: retries + 1 });
      }
    }
  }, []);

  // ─── Socket Connection ──────────────────────────────────────────────────────

  const connectSocket = useCallback(() => {
    const token = getAuthToken();
    const id = getDoctorId();

    if (!token || !id || !isValidObjectId(id)) {
      console.error('❌ Cannot connect socket: invalid credentials');
      return null;
    }

    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: SOCKET_RECONNECTION_ATTEMPTS,
      reconnectionDelay: SOCKET_RECONNECTION_DELAY,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setIsSocketConnected(true);
      if (selectedConvRef.current) {
        socket.emit('join_conversation', selectedConvRef.current._id);
      }
      processQueue();
    });

    socket.on('disconnect', (reason: string) => {
      console.log('❌ Socket disconnected:', reason);
      setIsSocketConnected(false);
    });

    socket.on('connect_error', (err: Error) => {
      console.error('❌ Socket connection error:', err.message);
      setIsSocketConnected(false);
    });

    // Socket event handlers using refs to avoid stale closures
    socket.on('new_message', (data: any) => handleNewMessageRef.current(data));
    socket.on('user_typing', (data: any) => handleTypingSocketRef.current(data));
    socket.on('messages_read_by_user', (data: any) => handleMessagesReadRef.current(data));

    socket.on('message_edited', (data: any) => {
      if (selectedConvRef.current?._id === data.conversationId) {
        setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, ...data.message } : m));
        if (data.message && selectedConvRef.current?.last_message?._id === data.messageId) {
          setConversations(prev =>
            prev.map(c =>
              c._id === data.conversationId
                ? { ...c, last_message: data.message }
                : c
            )
          );
        }
      }
    });

    socket.on('message_deleted', (data: any) => {
      if (deletingMessagesRef.current.has(data.messageId || data.message?._id)) {
        deletingMessagesRef.current.delete(data.messageId || data.message?._id);
        return;
      }

      if (data.type === 'everyone') {
        const deletedMsg = data.message;
        const messageId = deletedMsg?._id || data.messageId;
        setMessages(prev =>
          prev.map(m => {
            if (m._id !== messageId) return m;
            return deletedMsg
              ? { ...m, ...deletedMsg }
              : { ...m, deleted: true, message: 'This message was deleted', reactions: [] };
          })
        );
        if (selectedConvRef.current?.last_message?._id === messageId) {
          setConversations(prev =>
            prev.map(c =>
              c._id === data.conversationId
                ? {
                  ...c,
                  last_message: {
                    _id: messageId,
                    message: 'This message was deleted',
                    message_type: 'text',
                    deleted: true,
                    timestamp: new Date().toISOString(),
                  } as Message,
                }
                : c
            )
          );
        }
      } else if (data.type === 'me') {
        const messageId = data.messageId;
        setMessages(prev =>
          prev.map(m => {
            if (m._id !== messageId) return m;
            return {
              ...m,
              deleted_for_me: true,
              message: 'This message was deleted',
              message_type: 'text',
              reactions: [],
            };
          })
        );
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

    socket.on('message_sent_success', (res: any) => {
      if (res.messageId && res.tempId) {
        setMessages(prev =>
          prev.map(m => m._id === res.tempId ? { ...m, _id: res.messageId, _temp: false } : m)
        );
        pendingMessagesRef.current.add(res.messageId);
      }
    });

    socket.on('message_error', (err: any) => {
      if (err.tempId) {
        setMessages(prev => prev.map(m => m._id === err.tempId ? { ...m, _failed: true } : m));
      }
    });

    return socket;
  }, [processQueue]);

  // ─── Socket Event Handlers (using refs) ─────────────────────────────────────

  const handleTypingSocket = useCallback((data: any) => {
    if (!selectedConvRef.current || data.conversationId !== selectedConvRef.current._id) return;
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      if (data.isTyping) {
        newSet.add(data.userId);
      } else {
        newSet.delete(data.userId);
      }
      return newSet;
    });
  }, []);

  const handleMessagesRead = useCallback((data: any) => {
    if (!selectedConvRef.current || data.conversationId !== selectedConvRef.current._id) return;
    setMessages(prev =>
      prev.map(m =>
        getSenderId(m.sender_id) !== doctorId ? { ...m, read: true } : m
      )
    );
  }, [doctorId]);

  const handleNewMessage = useCallback((rawMsg: any) => {
    if (!rawMsg) return;
    const convId = rawMsg.conversationId || rawMsg.conversation_id;

    if (pendingMessagesRef.current.has(rawMsg._id)) {
      pendingMessagesRef.current.delete(rawMsg._id);
      return;
    }

    const isDeletedForMe = rawMsg.deleted_for?.includes(doctorId);

    const msg: Message = {
      ...rawMsg,
      _id: rawMsg._id || `msg_${Date.now()}`,
      conversation_id: convId,
      message: isDeletedForMe ? 'This message was deleted' : (rawMsg.message || ''),
      message_type: isDeletedForMe ? 'text' : (rawMsg.message_type || 'text'),
      timestamp: rawMsg.timestamp || new Date().toISOString(),
      reactions: isDeletedForMe ? [] : (rawMsg.reactions || []),
      deleted_for_me: isDeletedForMe,
    };

    const active = selectedConvRef.current;
    updateConversationLastMessage(convId, msg);

    if (active?._id === convId) {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        const senderId = getSenderId(msg.sender_id);
        if (senderId === doctorId) {
          const tempIndex = prev.findIndex(m => m._temp && m.message === msg.message);
          if (tempIndex !== -1) {
            const newMessages = [...prev];
            newMessages[tempIndex] = msg;
            return newMessages;
          }
        }
        return [...prev, msg];
      });
      markAsReadAPI(convId);
      debouncedScrollToBottom();
    }
  }, [doctorId, markAsReadAPI, debouncedScrollToBottom, updateConversationLastMessage]);

  // Update refs when handlers change
  useEffect(() => {
    handleNewMessageRef.current = handleNewMessage;
    handleTypingSocketRef.current = handleTypingSocket;
    handleMessagesReadRef.current = handleMessagesRead;
  }, [handleNewMessage, handleTypingSocket, handleMessagesRead]);

  // ─── Initialize ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authChecked) return;
    if (authError) return;

    fetchConversations();
    connectSocket();

    const queueInterval = setInterval(processQueue, 3000);
    return () => clearInterval(queueInterval);
  }, [authChecked, authError, fetchConversations, connectSocket, processQueue]);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv._id);
      setTypingUsers(new Set());
    }
  }, [selectedConv, fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) debouncedScrollToBottom();
  }, [messages, debouncedScrollToBottom]);

  // ─── Typing Handlers ────────────────────────────────────────────────────────

  const handleTypingStart = useCallback(() => {
    if (!selectedConvRef.current || !socketRef.current?.connected) return;
    socketRef.current.emit('typing_start', { conversationId: selectedConvRef.current._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current?.connected && selectedConvRef.current) {
        socketRef.current.emit('typing_stop', { conversationId: selectedConvRef.current._id });
      }
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT);
  }, []);

  const handleTypingStop = useCallback(() => {
    if (!selectedConvRef.current || !socketRef.current?.connected) return;
    socketRef.current.emit('typing_stop', { conversationId: selectedConvRef.current._id });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // ─── Phone Search ───────────────────────────────────────────────────────────

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSearchResult(null);

    if (!value.trim()) {
      setSearchStatus('idle');
      return;
    }

    if (isPhoneLike(value)) {
      setSearchStatus('searching');
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const token = getAuthToken();
          if (!token) {
            redirectToLoginPage();
            return;
          }

          const response = await fetch(
            `${API_BASE_URL}/messages/search-user?phone=${encodeURIComponent(value.trim())}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.status === 401) {
            redirectToLoginPage();
            return;
          }

          const data = await response.json();
          if (data.success && data.data) {
            setSearchResult(data.data);
            setSearchStatus('found');
          } else {
            setSearchResult(null);
            setSearchStatus('not-found');
          }
        } catch (error) {
          console.error('Search failed:', error);
          setSearchStatus('error');
        }
      }, 600);
    } else {
      setSearchStatus('idle');
    }
  };

  const handleStartConversation = async (user: User) => {
    if (startingConv) return;
    setStartingConv(true);
    try {
      const token = getAuthToken();
      if (!token) {
        redirectToLoginPage();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/messages/conversations/find-or-create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: user._id }),
      });

      if (response.status === 401) {
        redirectToLoginPage();
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        const newConv: Conversation = data.data;
        setConversations(prev => {
          const exists = prev.find(c => c._id === newConv._id);
          if (exists) return prev;
          return [newConv, ...prev];
        });
        setSelectedConv(newConv);
        setSearchQuery('');
        setSearchResult(null);
        setSearchStatus('idle');
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setStartingConv(false);
    }
  };

  // ─── Send Message ───────────────────────────────────────────────────────────

  const handleSendText = async () => {
    if (!input.trim() || !selectedConv || sending) return;

    const text = input.trim();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempMsg: Message = {
      _id: tempId,
      conversation_id: selectedConv._id,
      sender_id: { _id: doctorId!, name: 'You', role: 'doctor' },
      receiver_id: selectedConv.participant,
      message: text,
      message_type: 'text',
      read: false,
      timestamp: new Date().toISOString(),
      _temp: true,
    };

    setMessages(prev => [...prev, tempMsg]);
    setInput('');
    setShowInputEmojiPicker(false);
    handleTypingStop();
    setSending(true);

    const msgData = {
      conversationId: selectedConv._id,
      receiverId: selectedConv.participant._id,
      message: text,
      messageType: 'text',
    };

    try {
      const result = await sendViaSocket(tempId, msgData);
      setMessages(prev =>
        prev.map(m => m._id === tempId ? { ...m, _id: result.messageId, _temp: false } : m)
      );
    } catch (error) {
      console.error('Failed to send via socket, adding to queue:', error);
      messageQueueRef.current.set(tempId, { message: tempMsg, data: msgData, retries: 0 });

      // REST fallback
      try {
        const token = getAuthToken();
        if (token) {
          const response = await fetch(`${API_BASE_URL}/messages/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              receiver_id: selectedConv.participant._id,
              message: text,
              message_type: 'text',
            }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.message?._id) {
              setMessages(prev =>
                prev.map(m => m._id === tempId ? { ...m, _id: data.data.message._id, _temp: false } : m)
              );
              pendingMessagesRef.current.add(data.data.message._id);
              messageQueueRef.current.delete(tempId);
            }
          }
        }
      } catch (restError) {
        console.error('REST fallback failed:', restError);
      }
    } finally {
      setSending(false);
    }
  };

  // ─── Send File ──────────────────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv || sending) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large (max 10 MB)');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const tempId = `temp_media_${Date.now()}`;
    const blobUrl = URL.createObjectURL(file);

    const tempMsg: Message = {
      _id: tempId,
      conversation_id: selectedConv._id,
      sender_id: { _id: doctorId!, name: 'You', role: 'doctor' },
      receiver_id: selectedConv.participant,
      message: '',
      message_type: isImage ? 'image' : 'file',
      media_url: blobUrl,
      media_name: file.name,
      read: false,
      timestamp: new Date().toISOString(),
      _temp: true,
    };

    setMessages(prev => [...prev, tempMsg]);
    debouncedScrollToBottom();
    setSending(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiver_id', selectedConv.participant._id);
    if (selectedConv.medical_record_id) {
      formData.append('medical_record_id', selectedConv.medical_record_id.toString());
    }

    try {
      const token = getAuthToken();
      if (!token) {
        redirectToLoginPage();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/messages/send-with-media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 401) {
        redirectToLoginPage();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?._id) {
          setMessages(prev =>
            prev.map(m => m._id === tempId ? { ...m, _id: data.data._id, media_url: data.data.media_url, _temp: false } : m)
          );
          pendingMessagesRef.current.add(data.data._id);
        }
      } else {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _failed: true } : m));
      }
    } catch (error) {
      console.error('Failed to send file:', error);
      setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _failed: true } : m));
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      URL.revokeObjectURL(blobUrl);
    }
  };

  // ─── Delete Message ─────────────────────────────────────────────────────────

  const deleteViaSocket = (messageId: string, conversationId: string, type: 'me' | 'everyone'): Promise<any> =>
    new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      socketRef.current.timeout(5000).emit(
        'delete_message',
        { messageId, conversationId, type },
        (err: any, res: any) => {
          if (err || !res?.success) {
            reject(new Error(err?.message || res?.error || 'Delete failed'));
          } else {
            resolve(res);
          }
        }
      );
    });

  const handleDeleteMessage = async (messageId: string, type: 'me' | 'everyone') => {
    const conv = selectedConvRef.current;
    if (!conv) return;

    if (!messageId || typeof messageId !== 'string') {
      console.warn('Invalid messageId:', messageId);
      return;
    }

    if (messageId.startsWith('temp_')) {
      alert('Please wait for the message to be sent before deleting');
      return;
    }

    // Ngăn double-click
    if (deletingMessages.has(messageId)) return;
    setDeletingMessages(prev => new Set(prev).add(messageId));

    if (!window.confirm(type === 'everyone' ? 'Delete this message for everyone?' : 'Remove this message from your view?')) {
      setDeletingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      return;
    }

    const targetMessage = messages.find(m => m._id === messageId);
    const isLastMessage = conv.last_message?._id === messageId;

    // Optimistic update
    if (type === 'everyone') {
      setMessages(prev =>
        prev.map(m =>
          m._id === messageId ? { ...m, deleted: true, message: 'This message was deleted', reactions: [] } : m
        )
      );
    } else {
      setMessages(prev =>
        prev.map(m =>
          m._id === messageId
            ? { ...m, deleted_for_me: true, message: 'This message was deleted', message_type: 'text', reactions: [] }
            : m
        )
      );
    }

    if (isLastMessage) {
      setConversations(prev =>
        prev.map(c =>
          c._id === conv._id
            ? {
              ...c,
              last_message: {
                _id: messageId,
                message: 'This message was deleted',
                message_type: 'text',
                deleted: type === 'everyone',
                deleted_for_me: type === 'me',
                timestamp: targetMessage?.timestamp || new Date().toISOString(),
              } as Message,
            }
            : c
        )
      );
    }

    // Thêm timeout để tránh rollback quá sớm
    const deleteTimeout = setTimeout(() => {
      console.warn('Delete operation timeout, will retry...');
    }, 5000);

    try {
      if (socketRef.current?.connected) {
        await deleteViaSocket(messageId, conv._id, type);
        clearTimeout(deleteTimeout);
        setDeletingMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        return;
      }
      throw new Error('Socket not connected');
    } catch (error) {
      clearTimeout(deleteTimeout);
      console.warn('Socket delete failed, falling back to REST:', error);

      // KHÔNG rollback ngay, chờ REST fallback
      try {
        const token = getAuthToken();
        if (!token) throw new Error('No token');

        const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // Success - giữ nguyên optimistic update
        setDeletingMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      } catch (restError) {
        console.error('REST delete failed:', restError);
        // Chỉ rollback nếu cả socket và REST đều thất bại
        // Rollback về snapshot
        setMessages(prev => prev.map(m =>
          m._id === messageId ? targetMessage! : m
        ));
        if (isLastMessage) {
          setConversations(prev =>
            prev.map(c =>
              c._id === conv._id
                ? { ...c, last_message: targetMessage }
                : c
            )
          );
        }
        alert('Failed to delete message. Please try again.');
        setDeletingMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }
    }
  };


  // ─── Edit Message ───────────────────────────────────────────────────────────

  const handleEditMessage = async () => {
    if (!editingMessage || !editInput.trim()) return;

    try {
      const token = getAuthToken();
      if (!token) {
        redirectToLoginPage();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/messages/${editingMessage._id}/edit`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newMessage: editInput }),
      });

      if (response.status === 401) {
        redirectToLoginPage();
        return;
      }

      if (response.ok) {
        const updatedMsg = { ...editingMessage, message: editInput, edited: true };
        setMessages(prev => prev.map(m => m._id === editingMessage._id ? updatedMsg : m));
        if (selectedConvRef.current?.last_message?._id === editingMessage._id) {
          setConversations(prev =>
            prev.map(c =>
              c._id === selectedConvRef.current?._id ? { ...c, last_message: updatedMsg } : c
            )
          );
        }
        setEditingMessage(null);
        setEditInput('');
      } else {
        alert('Failed to edit message');
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert('Failed to edit message');
    }
  };

  // ─── Reaction ───────────────────────────────────────────────────────────────

  const handleReaction = async (messageId: string, emoji: string) => {
    setReactingToMessageId(null);

    // Optimistic update
    setMessages(prev =>
      prev.map(m => {
        if (m._id !== messageId) return m;
        const reactions = [...(m.reactions || [])];
        const existingIndex = reactions.findIndex(r => {
          const userId = typeof r.user_id === 'object' ? r.user_id._id : r.user_id;
          return userId === doctorId && r.emoji === emoji;
        });
        if (existingIndex > -1) {
          reactions.splice(existingIndex, 1);
        } else {
          reactions.push({ user_id: { _id: doctorId, name: 'You' } as any, emoji });
        }
        return { ...m, reactions };
      })
    );

    try {
      const token = getAuthToken();
      if (!token) return;

      await fetch(`${API_BASE_URL}/messages/${messageId}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: emoji }),
      });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  // ─── Message Bubble Component ───────────────────────────────────────────────

  const MessageBubble = ({ msg }: { msg: Message }) => {
    const isMe = getSenderId(msg.sender_id) === doctorId;
    const isDeletedForMe = msg.deleted_for_me === true;
    const isDeleted = msg.deleted === true || isDeletedForMe;
    const isHovered = hoveredMessageId === msg._id;

    const grouped: Record<string, { count: number; byMe: boolean }> = {};
    msg.reactions?.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, byMe: false };
      grouped[r.emoji].count++;
      const userId = typeof r.user_id === 'object' ? r.user_id._id : r.user_id;
      if (userId === doctorId) grouped[r.emoji].byMe = true;
    });

    return (
      <div
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 group relative`}
        onMouseEnter={() => setHoveredMessageId(msg._id)}
        onMouseLeave={() => setHoveredMessageId(null)}
      >
        <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
          {/* Action Menu */}
          {!isDeleted && !msg._temp && (
            <div
              className={`absolute -top-8 ${isMe ? 'right-0' : 'left-0'} z-10 bg-white dark:bg-[#102023] shadow-lg rounded-full px-2 py-1 flex gap-1 transition-opacity border border-slate-100 dark:border-[#1e3438]
              ${isHovered || reactingToMessageId === msg._id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <ActionButton icon="add_reaction" onClick={() => setReactingToMessageId(msg._id)} title="React" />
              {isMe && msg.message_type === 'text' && !msg._failed && (
                <ActionButton
                  icon="edit"
                  onClick={() => { setEditingMessage(msg); setEditInput(msg.message); }}
                  title="Edit message"
                />
              )}
              {isMe && (
                <ActionButton
                  icon="delete_sweep"
                  onClick={() => handleDeleteMessage(msg._id, 'everyone')}
                  color="text-rose-400"
                  hoverColor="hover:text-rose-600 hover:bg-rose-50"
                  title={msg.read ? 'Delete for everyone (already seen)' : 'Unsend message'}
                />
              )}
              {!isDeletedForMe && (
                <ActionButton
                  icon="delete"
                  onClick={() => handleDeleteMessage(msg._id, 'me')}
                  color="text-rose-400"
                  hoverColor="hover:text-rose-600 hover:bg-rose-50"
                  title="Remove from my view"
                />
              )}
            </div>
          )}

          {/* Reaction Picker */}
          {reactingToMessageId === msg._id && (
            <div
              ref={reactionPickerRef}
              className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} z-50 shadow-2xl rounded-2xl`}
            >
              <EmojiPicker
                onEmojiClick={(data) => handleReaction(msg._id, data.emoji)}
                width={300}
                height={350}
                searchDisabled={false}
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`shadow-sm transition-all ${msg.message_type === 'image' && !isDeleted
              ? 'rounded-2xl p-1 bg-white border border-slate-100'
              : `px-4 py-3 rounded-[1.5rem] ${isDeleted
                ? 'bg-slate-100 text-slate-400 border border-slate-200 italic'
                : msg._failed
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isMe
                    ? 'bg-primary text-white rounded-br-none shadow-md shadow-primary/20'
                    : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
              }`
              }`}
          >
            {isDeleted && (
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-base">block</span>
                <span>This message was deleted</span>
              </div>
            )}
            {msg._failed && !isDeleted && (
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-base">error</span>
                <span>Failed to send — will retry</span>
              </div>
            )}
            {!isDeleted && !msg._failed && (
              <>
                {msg.message_type === 'text' && (
                  <p className="text-[14px] font-medium leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                    {msg.edited && <span className="text-[10px] opacity-60 ml-2 italic">(edited)</span>}
                    {msg._temp && <span className="text-[10px] opacity-60 ml-2">(sending…)</span>}
                  </p>
                )}
                {msg.message_type === 'image' && (
                  <div className="relative group/img cursor-pointer">
                    <img
                      src={getMediaUrl(msg.media_url)}
                      alt="Attachment"
                      className="rounded-xl max-h-[260px] object-cover w-auto min-w-[120px] min-h-[120px] bg-slate-100"
                      loading="lazy"
                    />
                    <a
                      href={getMediaUrl(msg.media_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-xl"
                    >
                      <span className="material-symbols-outlined text-white text-2xl">open_in_new</span>
                    </a>
                    {msg._temp && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                        <div className="size-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                )}
                {msg.message_type === 'file' && (
                  <div className="flex items-center gap-3">
                    <div className={`size-9 rounded-full flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
                      <span className="material-symbols-outlined text-lg">description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-sm max-w-[140px]">{msg.media_name || 'File'}</p>
                      <a
                        href={getMediaUrl(msg.media_url)}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-xs hover:underline ${isMe ? 'text-white/70' : 'text-primary'}`}
                      >
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Reactions Display */}
          {!isDeleted && !msg._failed && Object.keys(grouped).length > 0 && (
            <div className={`flex gap-1 mt-1 flex-wrap px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(grouped).map(([emoji, data]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(msg._id, emoji)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors
                    ${data.byMe ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <span>{emoji}</span>
                  <span>{data.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Timestamp & Read Status */}
          <div className="mt-1 text-[10px] font-semibold opacity-50 flex items-center gap-1 px-1">
            {safeFormatTime(msg.timestamp)}
            {isMe && !isDeleted && !msg._failed && (
              <span className="material-symbols-outlined text-[12px]">
                {msg.read ? 'done_all' : msg._temp ? 'pending' : 'done'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Render Loading / Error States ──────────────────────────────────────────

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0b1619]">
        <div className="text-center">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0b1619]">
        <div className="text-center max-w-md px-6">
          <div className="size-16 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-rose-500 text-3xl">error</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Authentication Error</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{authError}</p>
          <button
            onClick={() => redirectToLoginPage()}
            className="px-5 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b1619] overflow-hidden text-slate-900 dark:text-white">
      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#102023] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 dark:border-[#1e3438]">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">Edit message</h3>
            <input
              value={editInput}
              onChange={e => setEditInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleEditMessage(); }}
              className="w-full bg-slate-50 dark:bg-[#1a2c2f] border border-slate-200 dark:border-[#224449] rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-primary text-sm dark:text-white"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingMessage(null)}
                className="px-4 py-2 text-sm text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-[#1a2c2f] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMessage}
                className="px-5 py-2 text-sm bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`w-full md:w-80 lg:w-[340px] flex flex-col border-r border-slate-200 dark:border-[#1e3438] bg-white dark:bg-[#102023] shrink-0 ${selectedConv ? 'hidden md:flex' : 'flex'
          }`}
      >
        {/* Sidebar Header */}
        <div className="px-5 pt-6 pb-3">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Messages</h1>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase
              ${isSocketConnected
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                }`}
            >
              <span className={`size-1.5 rounded-full ${isSocketConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
              {isSocketConnected ? 'Live' : 'Offline'}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
              {searchStatus === 'searching' ? 'hourglass_empty' : 'search'}
            </span>
            <input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by name or phone number…"
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1a2c2f] border border-slate-100 dark:border-[#224449] text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResult(null); setSearchStatus('idle'); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchQuery && isPhoneLike(searchQuery) && (
            <div className="mt-2 rounded-xl border border-slate-100 dark:border-[#224449] bg-white dark:bg-[#1a2c2f] overflow-hidden shadow-lg">
              {searchStatus === 'searching' && (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Searching for user…</p>
                </div>
              )}
              {searchStatus === 'found' && searchResult && (
                <div className="p-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2 pb-1">Patient found</p>
                  <button
                    onClick={() => handleStartConversation(searchResult)}
                    disabled={startingConv}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                  >
                    <Avatar user={searchResult} size="sm" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors truncate">
                        {searchResult.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{searchResult.phoneNumber}</p>
                    </div>
                    <div
                      className={`shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-primary transition-opacity ${startingConv ? 'opacity-50' : 'hover:bg-primary/90'
                        }`}
                    >
                      {startingConv ? (
                        <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">chat</span>
                          Chat
                        </>
                      )}
                    </div>
                  </button>
                </div>
              )}
              {searchStatus === 'not-found' && (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="size-7 rounded-full bg-slate-100 dark:bg-[#224449] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-400 text-sm">person_off</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No patient found</p>
                    <p className="text-[11px] text-slate-400">This phone number is not registered</p>
                  </div>
                </div>
              )}
              {searchStatus === 'error' && (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="material-symbols-outlined text-rose-400 text-base">error</span>
                  <p className="text-xs text-slate-500">Search failed — please try again</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="size-14 rounded-2xl bg-slate-100 dark:bg-[#1a2c2f] flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-slate-400 text-2xl">forum</span>
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1">Search by phone number to start a chat</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {conversations
                .filter(conv => {
                  if (!searchQuery || isPhoneLike(searchQuery)) return true;
                  return conv.participant?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                })
                .map(conv => {
                  const isActive = selectedConv?._id === conv._id;
                  return (
                    <div
                      key={conv._id}
                      onClick={() => setSelectedConv(conv)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group
                        ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20' : 'hover:bg-slate-50 dark:hover:bg-[#1a2c2f]'}`}
                    >
                      <div className="relative shrink-0">
                        <Avatar user={conv.participant} size="md" />
                        {isSocketConnected && (
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 ${isActive ? 'border-primary bg-emerald-400' : 'border-white dark:border-[#102023] bg-emerald-400'
                              }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                            {conv.participant?.name || 'Unknown'}
                          </p>
                          <span className={`text-[10px] font-semibold shrink-0 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                            {safeFormatTime(conv.last_message_at)}
                          </span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                          {getPreviewText(conv.last_message) || 'No messages yet'}
                        </p>
                      </div>
                      {conv.unread_count > 0 && !isActive && (
                        <span className="size-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`flex-1 flex-col h-full overflow-hidden bg-white dark:bg-[#102023] ${selectedConv ? 'flex fixed inset-0 z-50 md:static' : 'hidden md:flex'
          }`}
      >
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <header className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1e3438] bg-white/95 dark:bg-[#102023]/95 backdrop-blur-xl z-20 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedConv(null); setMessages([]); }}
                  className="md:hidden size-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1a2c2f] transition-colors -ml-1"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="relative">
                  <Avatar user={selectedConv.participant} size="md" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white dark:border-[#102023] ${isSocketConnected ? 'bg-emerald-400' : 'bg-slate-300'
                      }`}
                  />
                </div>
                <div>
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {selectedConv.participant?.name}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    {selectedConv.participant?.phoneNumber || `ID · ${selectedConv._id.slice(-5).toUpperCase()}`}
                  </p>
                </div>
              </div>
              {typingUsers.size > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Typing…
                </div>
              )}
            </header>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto px-5 py-5 bg-slate-50/40 dark:bg-[#0b1619]/60 scroll-smooth">
              {messagesLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="size-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                  <div className="size-14 rounded-2xl bg-white dark:bg-[#102023] border border-slate-100 dark:border-[#1e3438] flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-slate-400 text-2xl">chat_bubble</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No messages yet</p>
                  <p className="text-xs text-slate-400">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg, index) => (
                    <MessageBubble key={msg._id || index} msg={msg} />
                  ))}
                  {typingUsers.size > 0 && (
                    <div className="flex justify-start mb-4">
                      <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#102023] border border-slate-100 dark:border-[#1e3438] rounded-bl-none">
                        <div className="flex gap-1">
                          {[0, 150, 300].map(delay => (
                            <div key={delay} className="size-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-px w-full" />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="shrink-0 bg-white dark:bg-[#102023] border-t border-slate-100 dark:border-[#1e3438] px-4 py-3">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1a2c2f] border border-slate-100 dark:border-[#224449] rounded-2xl px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  className="size-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-lg">attach_file</span>
                </button>

                <div className="relative" ref={emojiRef}>
                  <button
                    onClick={() => setShowInputEmojiPicker(v => !v)}
                    disabled={sending}
                    className={`size-8 flex items-center justify-center rounded-xl transition-colors shrink-0
                      ${showInputEmojiPicker ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                  >
                    <span className="material-symbols-outlined text-lg">sentiment_satisfied</span>
                  </button>
                  {showInputEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-3 z-50 shadow-2xl rounded-2xl border border-slate-100 dark:border-[#1e3438]">
                      <EmojiPicker
                        onEmojiClick={(data: EmojiClickData) => { setInput(prev => prev + data.emoji); handleTypingStart(); }}
                        width={300}
                        height={380}
                        searchDisabled={false}
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  )}
                </div>

                <input
                  value={input}
                  onChange={e => { setInput(e.target.value); handleTypingStart(); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendText();
                    }
                  }}
                  onBlur={handleTypingStop}
                  placeholder="Type a message…"
                  className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400 outline-none py-1.5 px-2"
                  disabled={sending}
                />

                <button
                  onClick={handleSendText}
                  disabled={!input.trim() || sending}
                  className={`size-9 flex items-center justify-center rounded-xl shrink-0 transition-all
                    ${input.trim() && !sending ? 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95' : 'bg-slate-200 dark:bg-[#224449] text-slate-400'}`}
                >
                  {sending ? (
                    <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">send</span>
                  )}
                </button>
              </div>

              {/* Status Line */}
              {(sending || !isSocketConnected) && (
                <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-slate-400">
                  <span className={`size-1.5 rounded-full ${sending ? 'bg-primary animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
                  {sending ? 'Sending…' : 'Offline — messages will be queued'}
                </div>
              )}
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none">
            <div className="size-20 rounded-3xl bg-slate-100 dark:bg-[#1a2c2f] flex items-center justify-center mb-5 shadow-inner">
              <span className="material-symbols-outlined text-primary/30 text-5xl">chat_bubble</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Your messages</h2>
            <p className="text-sm text-slate-400 max-w-[220px]">
              Select a conversation or search by phone number to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;