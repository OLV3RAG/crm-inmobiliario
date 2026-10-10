import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Search, Send, MessageSquare, Phone, MoreVertical, Check, CheckCheck, Paperclip } from 'lucide-react';
import { crmApi } from '@/services/crm.api';

type Chat = {
  id: string;
  name: string;
  phone: string;
  unread: number;
  lastMsg: string;
  time: string;
  score: number;
  temp: string;
  action: string;
  status: 'online' | 'offline';
};

type ChatMessage = { id: string; text: string; time: string; sender: 'client' | 'agent' };

const ScoreCircle = ({ score }: { score: number }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score > 80 ? '#10B981' : score > 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <svg className="w-10 h-10 transform -rotate-90">
        <circle cx="20" cy="20" r="16" fill="transparent" stroke="#1E1E2E" strokeWidth="3" />
        <circle 
          cx="20" cy="20" r="16" fill="transparent" 
          stroke={color} strokeWidth="3" 
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-zinc-300">{score}</span>
    </div>
  );
};

export const ConversationsView = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [inputMsg, setInputMsg] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [isScoring, setIsScoring] = useState(false);
  const [aiInsight, setAiInsight] = useState<{score: number, temp: string, action: string} | null>(null);

  useEffect(() => {
    crmApi.getConversations().then((rows) => {
      const list = rows as Chat[];
      setChats(list);
      setActiveChat(list[0] || null);
    });
  }, []);

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    crmApi.getMessages(activeChat.id).then(setMessages).catch(() => setMessages([]));
  }, [activeChat?.id]);

  const analyzeConversation = async () => {
    if (!activeChat) return;
    setIsScoring(true);
    setAiInsight(null);
    setAiInsight({ score: activeChat.score, temp: activeChat.temp, action: activeChat.action });
    setIsScoring(false);
  };


  const handleSend = () => {
    if (!inputMsg.trim()) return;
    const newMsg = {
      id: `m${Date.now()}`,
      text: inputMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'agent'
    };
    setMessages([...messages, newMsg]);
    setInputMsg('');
  };

  return (
    <div className="flex h-full w-full bg-[#0A0A0F] font-sans">
      {/* Sidebar - Chat List */}
      <div className="w-80 border-r border-[#1E1E2E] flex flex-col bg-[#0A0A0F]">
        <div className="p-4 border-b border-[#1E1E2E] bg-[#0A0A0F]">
          <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#C5A880]" /> WhatsApp Meta
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar chat..." 
              className="w-full bg-[#12121A] border border-[#1E1E2E] rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-[#C5A880] transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChat(chat)}
              className={`p-4 border-b border-[#1E1E2E] cursor-pointer transition-colors flex items-center gap-3 ${activeChat?.id === chat.id ? 'bg-[#12121A]' : 'hover:bg-[#12121A]/50'}`}
            >
              <ScoreCircle score={chat.score} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-bold text-zinc-100 truncate">{chat.name}</h3>
                  <span className="text-xs text-zinc-500">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-zinc-400 truncate pr-2">{chat.lastMsg}</p>
                  {chat.unread > 0 && (
                    <span className="bg-[#C5A880] text-[#0A0A0F] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0A0A0F]">
        {/* Chat Header */}
        <div className="h-16 border-b border-[#1E1E2E] bg-[#12121A] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#1E1E2E] flex items-center justify-center text-[#C5A880] font-bold">
                {(activeChat?.name || '?').charAt(0)}
              </div>
              {activeChat?.status === 'online' && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#12121A] rounded-full" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">{activeChat?.name || 'Sin conversaciones'}</h2>
              <p className="text-xs text-zinc-500">{activeChat?.phone || 'La tabla conversations está vacía'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={analyzeConversation}
              disabled={isScoring}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C5A880]/10 text-[#C5A880] border border-[#C5A880]/20 hover:bg-[#C5A880]/20 transition-colors text-xs font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isScoring ? 'Analizando...' : 'AI Copilot'}
            </button>
            <button className="text-zinc-400 hover:text-[#C5A880] transition-colors"><Phone className="w-5 h-5" /></button>
            <button className="text-zinc-400 hover:text-[#C5A880] transition-colors"><Search className="w-5 h-5" /></button>
            <button className="text-zinc-400 hover:text-[#C5A880] transition-colors"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>
        
        {aiInsight && (
          <div className="bg-[#12121A] border-b border-[#1E1E2E] p-3 px-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-[#C5A880]" />
              <div className="text-sm">
                <span className="text-zinc-400">Intención detectada: </span>
                <span className="text-white font-bold capitalize">{aiInsight.temp} ({aiInsight.score}%)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Acción Sugerida:</span>
              <span className="text-sm font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">{aiInsight.action}</span>
              <button onClick={() => setAiInsight(null)} className="ml-2 text-zinc-500 hover:text-zinc-300 text-xs">Ocultar</button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#0A0A0F]" style={{ backgroundImage: 'radial-gradient(#1E1E2E 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.sender === 'agent' ? 'bg-[#C5A880] text-[#0A0A0F]' : 'bg-[#12121A] border border-[#1E1E2E] text-zinc-200'}`}>
                <p className="text-sm">{msg.text}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${msg.sender === 'agent' ? 'text-[#0A0A0F]/70' : 'text-zinc-500'}`}>
                  <span>{msg.time}</span>
                  {msg.sender === 'agent' && <CheckCheck className="w-3 h-3 text-[#0A0A0F]" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#1E1E2E] bg-[#12121A] flex items-center gap-3">
          <button className="text-zinc-400 hover:text-zinc-200 transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            placeholder="Escribe un mensaje..."
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-[#1E1E2E]/50 border border-[#1E1E2E] text-zinc-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C5A880] transition-colors"
          />
          <button 
            onClick={handleSend}
            className="bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0F] p-3 rounded-xl transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
