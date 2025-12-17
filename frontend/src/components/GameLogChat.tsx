import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Player } from '@/types';
import { Send, ScrollText } from 'lucide-react';

interface GameLogChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUser: Player;
}

export const GameLogChat: React.FC<GameLogChatProps> = ({ messages, onSendMessage, currentUser }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      // Smooth scroll to bottom when new messages arrive
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-900 flex items-center gap-2">
        <ScrollText size={16} className="text-emerald-500" />
        <span className="text-sm font-bold text-zinc-200">Game Activity</span>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.length === 0 && (
          <div className="text-center text-zinc-600 text-sm italic mt-10">
            <div className="mb-2">🎮 Game Activity</div>
            <div className="text-xs">Move notifications and chat messages will appear here</div>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.type === 'SYSTEM';

          if (isSystem) {
             return (
               <div key={msg.id} className="text-xs text-center text-zinc-500 my-2 px-4 py-1 bg-zinc-800/50 rounded-full mx-auto w-fit">
                 {msg.text}
               </div>
             );
          }

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-xs font-bold ${isMe ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {msg.senderName}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`
                max-w-[85%] px-3 py-2 rounded-lg text-sm
                ${isMe 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700'
                }
              `}>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 bg-zinc-950">
        <div className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-zinc-900 text-white pl-4 pr-10 py-2.5 rounded-lg border border-zinc-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-400 disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};