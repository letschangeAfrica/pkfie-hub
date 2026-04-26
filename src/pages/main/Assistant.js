import { useState, useRef, useEffect } from 'react';
import {
  FiSend, FiCpu, FiUser, FiZap, FiBook,
  FiDollarSign, FiCalendar, FiHelpCircle, FiTrash2,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api/chat/ai/`;

function getCurrentTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const QUICK_QUESTIONS = [
  { label: 'Tuition fees',          text: 'What are the tuition fees?',           icon: FiDollarSign },
  { label: 'Scholarships',          text: 'How do I apply for scholarships?',      icon: FiZap        },
  { label: 'Application deadline',  text: "What's the application deadline?",      icon: FiCalendar   },
  { label: 'Programs offered',      text: 'What programs are offered?',            icon: FiBook       },
  { label: 'Accommodation options', text: 'What are the accommodation options?',   icon: FiHelpCircle },
];

const FAQ_ITEMS = [
  { category: 'Admission Requirements', question: 'What are the requirements for international students?' },
  { category: 'Tuition & Fees',        question: 'Are there additional fees beyond tuition?'            },
  { category: 'Scholarships',          question: 'How can I apply for financial aid?'                   },
  { category: 'Academic Calendar',     question: 'When does the next semester start?'                   },
];

/* ── Typing dots ── */
const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-0.5" aria-label="AI is typing">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-gold/70"
        style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
      />
    ))}
    <style>{`
      @keyframes typingBounce {
        0%, 60%, 100% { transform: translateY(0); opacity:.5; }
        30% { transform: translateY(-6px); opacity:1; }
      }
    `}</style>
  </div>
);

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm the PKFIE-Hub AI Assistant, powered by PKFokam's knowledge base. Ask me anything about admissions, programs, policies, fees, or campus life.",
      time: getCurrentTime(),
    },
  ]);
  const [inputText,      setInputText]      = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setMessages(prev => [...prev, { id: prev.length + 1, type: 'user', content: trimmed, time: getCurrentTime() }]);
    setInputText('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ message: trimmed, ...(conversationId && { conversation_id: conversationId }) }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        const errMsg = data?.setup_required
          ? 'The AI assistant needs an API key to work. Please add your ANTHROPIC_API_KEY or OPENAI_API_KEY to the backend .env file.'
          : (data?.error || 'The AI service is temporarily unavailable. Please try again later.');
        setMessages(prev => [...prev, { id: prev.length + 1, type: 'ai', content: errMsg, time: getCurrentTime() }]);
        return;
      }

      if (data.conversation_id) setConversationId(data.conversation_id);
      const aiMsg = data.ai_message || data.message || {};
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        type: 'ai',
        content: aiMsg.message_text || 'Sorry, I could not get a response. Please try again.',
        time: getCurrentTime(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        type: 'ai',
        content: 'Could not reach the AI service. Check that the backend server is running.',
        time: getCurrentTime(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 1,
      type: 'ai',
      content: "Hello! I'm the PKFIE-Hub AI Assistant. How can I help you today?",
      time: getCurrentTime(),
    }]);
    setConversationId(null);
  };

  return (
    <div className="flex gap-0 h-full bg-slate-50 dark:bg-navy-950">

      {/* ── Left sidebar ──────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 flex-shrink-0
        bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-navy-700/40">

        {/* AI identity */}
        <div className="px-5 pt-6 pb-5 border-b border-slate-100 dark:border-navy-700/40">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #001F5B 0%, #003080 100%)' }}
            >
              <FiCpu size={22} className="text-gold" aria-hidden="true" />
            </div>
            <div>
              <p className="font-black text-slate-900 dark:text-white text-sm leading-tight">
                PKFIE AI Assistant
              </p>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-navy-400 leading-relaxed">
            Powered by PKFokam's knowledge base. Ask about admissions, programs, policies, fees, and more.
          </p>
        </div>

        {/* Quick questions */}
        <div className="px-4 py-4 border-b border-slate-100 dark:border-navy-700/40">
          <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-navy-500 mb-3 select-none">
            Quick Questions
          </p>
          <div className="space-y-1.5">
            {QUICK_QUESTIONS.map(({ label, text, icon: Icon }) => (
              <button
                key={label}
                onClick={() => sendMessage(text)}
                disabled={isLoading}
                className="group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                  text-left text-[13px] font-semibold
                  text-slate-700 dark:text-navy-300
                  hover:text-slate-900 dark:hover:text-white
                  hover:bg-slate-50 dark:hover:bg-navy-700/50
                  border border-transparent hover:border-slate-200 dark:hover:border-navy-600/40
                  transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon
                  size={14}
                  aria-hidden="true"
                  className="flex-shrink-0 text-gold group-hover:scale-110 transition-transform"
                />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-navy-500 mb-3 select-none">
            Frequently Asked
          </p>
          <div className="space-y-2">
            {FAQ_ITEMS.map(({ category, question }) => (
              <button
                key={question}
                onClick={() => sendMessage(question)}
                disabled={isLoading}
                className="group w-full text-left px-3 py-3 rounded-xl
                  bg-slate-50 dark:bg-navy-800/60
                  hover:bg-slate-100 dark:hover:bg-navy-700/60
                  border border-slate-200/60 dark:border-navy-700/40
                  hover:border-gold/30
                  transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-[10px] font-black tracking-wide uppercase text-gold mb-1">
                  {category}
                </p>
                <p className="text-[12px] text-slate-600 dark:text-navy-300 leading-snug group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {question}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Clear chat */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-navy-700/40">
          <button
            onClick={clearChat}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl
              text-[12px] font-bold text-slate-400 dark:text-navy-500
              hover:text-red-500 dark:hover:text-red-400
              hover:bg-red-50 dark:hover:bg-red-500/10
              border border-transparent hover:border-red-200 dark:hover:border-red-500/20
              transition-all"
          >
            <FiTrash2 size={13} aria-hidden="true" />
            Clear conversation
          </button>
        </div>
      </aside>

      {/* ── Chat panel ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Chat header */}
        <div className="flex items-center justify-between px-6 py-4
          bg-white dark:bg-navy-900
          border-b border-slate-200 dark:border-navy-700/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center lg:hidden"
              style={{ background: 'linear-gradient(135deg, #001F5B 0%, #003080 100%)' }}
            >
              <FiCpu size={17} className="text-gold" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                AI Assistant
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-navy-400 font-medium">
                {messages.length - 1} message{messages.length !== 2 ? 's' : ''} in this session
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            aria-label="Clear chat"
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50
              dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors"
          >
            <FiTrash2 size={15} aria-hidden="true" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 min-h-0 scrollbar-thin
          bg-slate-50 dark:bg-navy-950">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2.5 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-up`}
            >
              {/* Avatar */}
              <div
                className={[
                  'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white',
                  msg.type === 'ai'
                    ? 'bg-gradient-to-br from-navy-700 to-navy-900 dark:from-navy-600 dark:to-navy-800'
                    : '',
                ].join(' ')}
                style={msg.type === 'user' ? { background: 'linear-gradient(135deg, #FFD700 0%, #E6A800 100%)' } : undefined}
                aria-hidden="true"
              >
                {msg.type === 'ai'
                  ? <FiCpu size={14} className="text-gold" />
                  : <FiUser size={14} className="text-navy-900" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[72%] ${msg.type === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div
                  className={[
                    'px-4 py-3 text-sm leading-relaxed',
                    msg.type === 'ai'
                      ? 'bg-white dark:bg-navy-800 text-slate-800 dark:text-navy-100 rounded-2xl rounded-bl-md border border-slate-100 dark:border-navy-700/40 shadow-sm'
                      : 'text-navy-900 rounded-2xl rounded-br-md',
                  ].join(' ')}
                  style={msg.type === 'user' ? {
                    background: 'linear-gradient(135deg, #001F5B 0%, #002B80 100%)',
                    color: 'white',
                  } : undefined}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-navy-600 px-1 font-medium">
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-end gap-2.5 animate-fade-up">
              <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                bg-gradient-to-br from-navy-700 to-navy-900 dark:from-navy-600 dark:to-navy-800"
                aria-hidden="true"
              >
                <FiCpu size={14} className="text-gold" />
              </div>
              <div className="px-4 py-3.5 bg-white dark:bg-navy-800 rounded-2xl rounded-bl-md
                border border-slate-100 dark:border-navy-700/40 shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 bg-white dark:bg-navy-900
          border-t border-slate-200 dark:border-navy-700/40 px-4 py-4">

          {/* Mobile quick questions */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 scrollbar-thin">
            {QUICK_QUESTIONS.map(({ label, text }) => (
              <button
                key={label}
                onClick={() => sendMessage(text)}
                disabled={isLoading}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold
                  bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-navy-300
                  hover:bg-gold/10 hover:text-gold border border-slate-200 dark:border-navy-700/40
                  hover:border-gold/30 transition-all disabled:opacity-40 whitespace-nowrap"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex items-end gap-3">
            <div
              className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #001F5B 0%, #003080 100%)' }}
              aria-hidden="true"
            >
              <FiCpu size={15} className="text-gold" />
            </div>

            <div className="flex-1 relative">
              <textarea
                rows={1}
                value={inputText}
                onChange={e => {
                  setInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(inputText);
                  }
                }}
                placeholder="Ask anything about PKFokam Institute…"
                disabled={isLoading}
                aria-label="Message input"
                className="w-full resize-none overflow-hidden px-4 py-3 pr-12 rounded-2xl text-sm
                  bg-slate-50 dark:bg-navy-800
                  border border-slate-200 dark:border-navy-700/50
                  text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-navy-500
                  focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/15
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ minHeight: 48, lineHeight: '1.5' }}
              />
              <kbd className="absolute right-3 bottom-3 text-[10px] font-mono
                text-slate-400 dark:text-navy-600 select-none hidden sm:block">
                ↵
              </kbd>
            </div>

            <button
              onClick={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              aria-label="Send message"
              className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center
                transition-all hover:-translate-y-0.5 active:translate-y-0
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
                disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{
                background: inputText.trim() && !isLoading
                  ? 'linear-gradient(135deg, #FFD700 0%, #E6A800 100%)'
                  : undefined,
                backgroundColor: !inputText.trim() || isLoading ? '#e2e8f0' : undefined,
              }}
            >
              {isLoading
                ? <span className="w-4 h-4 border-2 border-navy-300 border-t-navy-700 rounded-full animate-spin" aria-hidden="true" />
                : <FiSend size={16} className={inputText.trim() ? 'text-navy-900' : 'text-slate-400'} aria-hidden="true" />
              }
            </button>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-navy-600 text-center mt-2.5 select-none">
            Press Enter to send · Shift+Enter for new line · AI responses are based on PKFokam's official data
          </p>
        </div>
      </div>
    </div>
  );
}
