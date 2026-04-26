import { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import {
  FiSend, FiCpu, FiUser, FiZap, FiBook,
  FiDollarSign, FiCalendar, FiHelpCircle, FiTrash2,
  FiCopy, FiCheck, FiDownload,
} from 'react-icons/fi';

marked.setOptions({ breaks: true, gfm: true });

/* Inject typing animation once at module load — avoids re-inserting on every TypingDots render */
if (typeof document !== 'undefined' && !document.getElementById('pkf-typing-css')) {
  const s = document.createElement('style');
  s.id = 'pkf-typing-css';
  s.textContent = `@keyframes typingBounce {
    0%,60%,100% { transform:translateY(0); opacity:.5; }
    30% { transform:translateY(-6px); opacity:1; }
  }`;
  document.head.appendChild(s);
}

const BASE_URL    = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API_URL     = `${BASE_URL}/api/chat/ai/`;
const STORAGE_KEY = 'pkfie_chat_session';
const MAX_CHARS   = 1000;

const GREETING = "Hello! I'm the PKFIE-Hub AI Assistant, powered by PKFokam's knowledge base. Ask me anything about admissions, programs, policies, fees, or campus life.";

const getCurrentTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const INITIAL_MESSAGE = { id: 1, type: 'ai', content: GREETING, time: getCurrentTime() };

const QUICK_QUESTIONS = [
  { label: 'Tuition fees',          text: 'What are the tuition fees?',          icon: FiDollarSign },
  { label: 'Scholarships',          text: 'How do I apply for scholarships?',     icon: FiZap        },
  { label: 'Application deadline',  text: "What's the application deadline?",     icon: FiCalendar   },
  { label: 'Programs offered',      text: 'What programs are offered?',           icon: FiBook       },
  { label: 'Accommodation options', text: 'What are the accommodation options?',  icon: FiHelpCircle },
];

const FAQ_ITEMS = [
  { category: 'Admission Requirements', question: 'What are the requirements for international students?' },
  { category: 'Tuition & Fees',         question: 'Are there additional fees beyond tuition?'           },
  { category: 'Scholarships',           question: 'How can I apply for financial aid?'                  },
  { category: 'Academic Calendar',      question: 'When does the next semester start?'                  },
];

const FOLLOW_UP_MAP = [
  { keys: ['fee', 'tuition', 'payment', 'cost'],           q: ['What payment plans are available?',     'Are there late payment penalties?']             },
  { keys: ['scholarship', 'financial aid', 'bursary'],     q: ['What GPA is needed for scholarships?',  'When does the scholarship application open?']   },
  { keys: ['admission', 'apply', 'application', 'enroll'], q: ['What documents are required?',          'How long does the review process take?']        },
  { keys: ['program', 'course', 'degree', 'major'],        q: ['Are there evening or part-time options?','What are the graduation requirements?']        },
  { keys: ['campus', 'accommodation', 'housing'],          q: ['What is included in accommodation?',    'How do I apply for on-campus housing?']         },
  { keys: ['deadline', 'date', 'calendar', 'semester'],    q: ['What are the exam dates?',              'When is the enrollment deadline?']              },
];

const getSuggestions = (content) => {
  const lower = content.toLowerCase();
  for (const { keys, q } of FOLLOW_UP_MAP) {
    if (keys.some(k => lower.includes(k))) return q;
  }
  return [];
};

/* ── Markdown prose for AI bubbles ─────────────────── */
const BASE_PROSE = [
  '[&_p]:mb-2 [&_p:last-child]:mb-0',
  '[&_h1]:text-base [&_h1]:font-black [&_h1]:mb-2 [&_h1]:mt-3',
  '[&_h2]:text-sm [&_h2]:font-black [&_h2]:mb-1.5 [&_h2]:mt-3',
  '[&_h3]:text-sm [&_h3]:font-bold [&_h3]:mb-1 [&_h3]:mt-2',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:space-y-0.5',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:space-y-0.5',
  '[&_li]:leading-relaxed',
  '[&_strong]:font-bold',
  '[&_em]:italic',
  '[&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono',
  '[&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre]:text-xs',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-gold/40 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:italic',
  '[&_a]:underline [&_a]:text-gold [&_a]:hover:text-gold/80',
  '[&_hr]:my-3',
].join(' ');

const PROSE_DARK  = `text-sm leading-relaxed text-navy-100 ${BASE_PROSE} [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_strong]:text-white [&_code]:bg-navy-700/60 [&_code]:text-gold [&_pre]:bg-navy-900/80`;
const PROSE_LIGHT = `text-sm leading-relaxed text-slate-800 ${BASE_PROSE} [&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-700 [&_code]:bg-slate-100 [&_code]:text-amber-700 [&_pre]:bg-slate-100`;

/* ── Typing dots ──────────────────────────────────── */
const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-0.5" aria-label="AI is typing">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-gold/70"
        style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
      />
    ))}
  </div>
);

export default function Assistant() {
  const [messages, setMessages] = useState(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) {
        const { msgs } = JSON.parse(s);
        if (Array.isArray(msgs) && msgs.length > 0) return msgs;
      }
    } catch {}
    return [INITIAL_MESSAGE];
  });

  const [conversationId, setConversationId] = useState(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) return JSON.parse(s).cid || null;
    } catch {}
    return null;
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId,  setCopiedId]  = useState(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const abortRef       = useRef(null);

  /* sync dark mode */
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  /* auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /* persist session */
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ msgs: messages, cid: conversationId }));
    } catch {}
  }, [messages, conversationId]);

  const resetTextarea = useCallback(() => {
    if (textareaRef.current) textareaRef.current.style.height = '48px';
  }, []);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || trimmed.length > MAX_CHARS) return;

    setMessages(prev => [...prev, {
      id: Date.now(), type: 'user', content: trimmed, time: getCurrentTime(),
    }]);
    setInputText('');
    resetTextarea();
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: trimmed,
          ...(conversationId && { conversation_id: conversationId }),
        }),
        signal: controller.signal,
      });

      const data = await resp.json();

      if (!resp.ok) {
        const errMsg = data?.setup_required
          ? 'The AI assistant needs an API key. Please add ANTHROPIC_API_KEY to the backend .env file.'
          : (data?.error || 'The AI service is temporarily unavailable. Please try again later.');
        setMessages(prev => [...prev, {
          id: Date.now(), type: 'ai', content: errMsg,
          time: getCurrentTime(), isError: true, retryText: trimmed,
        }]);
        return;
      }

      if (data.conversation_id) setConversationId(data.conversation_id);
      const aiText = data.ai_message?.message_text
        || data.message?.message_text
        || 'Sorry, I could not get a response. Please try again.';
      setMessages(prev => [...prev, {
        id: Date.now(), type: 'ai', content: aiText,
        time: getCurrentTime(), suggestions: getSuggestions(aiText),
      }]);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages(prev => [...prev, {
        id: Date.now(), type: 'ai',
        content: 'Could not reach the AI service. Check that the backend server is running.',
        time: getCurrentTime(), isError: true, retryText: trimmed,
      }]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading, conversationId, resetTextarea]);

  const abortRequest = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages([{ ...INITIAL_MESSAGE, id: Date.now(), time: getCurrentTime() }]);
    setConversationId(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const copyMessage = useCallback((id, content) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  }, []);

  const exportChat = useCallback(() => {
    const lines = messages
      .map(m => `[${m.time}] ${m.type === 'ai' ? 'PKFIE AI' : 'You'}:\n${m.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob(
      [`PKFIE Hub — Chat Export\n${new Date().toLocaleString()}\n\n${lines}`],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url;
    a.download = `pkfie-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  const userMsgCount = messages.filter(m => m.type === 'user').length;
  const overLimit    = inputText.length > MAX_CHARS;
  const proseCls     = dark ? PROSE_DARK : PROSE_LIGHT;

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
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
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
                  border border-slate-200/60 dark:border-navy-700/40 hover:border-gold/30
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

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-navy-700/40 flex gap-2">
          <button
            onClick={exportChat}
            disabled={userMsgCount === 0}
            title="Export conversation"
            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl
              text-[12px] font-bold text-slate-400 dark:text-navy-500
              hover:text-slate-700 dark:hover:text-navy-200
              hover:bg-slate-50 dark:hover:bg-navy-700/50
              border border-transparent hover:border-slate-200 dark:hover:border-navy-600/40
              transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FiDownload size={13} aria-hidden="true" />
            Export
          </button>
          <button
            onClick={clearChat}
            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl
              text-[12px] font-bold text-slate-400 dark:text-navy-500
              hover:text-red-500 dark:hover:text-red-400
              hover:bg-red-50 dark:hover:bg-red-500/10
              border border-transparent hover:border-red-200 dark:hover:border-red-500/20
              transition-all"
          >
            <FiTrash2 size={13} aria-hidden="true" />
            Clear
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
                {userMsgCount === 0
                  ? 'No messages yet — ask anything'
                  : `${userMsgCount} message${userMsgCount !== 1 ? 's' : ''} this session`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={exportChat}
              disabled={userMsgCount === 0}
              aria-label="Export conversation"
              className="p-2 rounded-lg text-slate-400 dark:text-navy-500
                hover:text-slate-700 dark:hover:text-navy-200
                hover:bg-slate-100 dark:hover:bg-navy-700/50
                transition-colors disabled:opacity-30 disabled:cursor-not-allowed lg:hidden"
            >
              <FiDownload size={15} aria-hidden="true" />
            </button>
            <button
              onClick={clearChat}
              aria-label="Clear chat"
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50
                dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors lg:hidden"
            >
              <FiTrash2 size={15} aria-hidden="true" />
            </button>
          </div>
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
                  'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center',
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

              {/* Bubble + sub-elements */}
              <div className={`max-w-[72%] flex flex-col gap-1 ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={[
                    'group relative px-4 py-3',
                    msg.type === 'ai'
                      ? `bg-white dark:bg-navy-800 rounded-2xl rounded-bl-md border shadow-sm ${
                          msg.isError
                            ? 'border-red-200 dark:border-red-500/30'
                            : 'border-slate-100 dark:border-navy-700/40'
                        }`
                      : 'text-white rounded-2xl rounded-br-md text-sm leading-relaxed',
                  ].join(' ')}
                  style={msg.type === 'user' ? {
                    background: 'linear-gradient(135deg, #001F5B 0%, #002B80 100%)',
                  } : undefined}
                >
                  {/* Copy button — AI only, visible on hover */}
                  {msg.type === 'ai' && (
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      aria-label="Copy message"
                      className="absolute top-2 right-2 p-1.5 rounded-lg
                        opacity-0 group-hover:opacity-100
                        text-slate-400 dark:text-navy-500
                        hover:text-slate-700 dark:hover:text-white
                        hover:bg-slate-100 dark:hover:bg-navy-700
                        transition-all"
                    >
                      {copiedId === msg.id
                        ? <FiCheck size={11} className="text-emerald-500" />
                        : <FiCopy size={11} />
                      }
                    </button>
                  )}

                  {/* Content — markdown for AI, plain for user */}
                  {msg.type === 'ai' ? (
                    <div
                      className={`${proseCls} pr-5`}
                      dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                    />
                  ) : (
                    msg.content
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-slate-400 dark:text-navy-600 px-1 font-medium">
                  {msg.time}
                </span>

                {/* Retry on error */}
                {msg.isError && msg.retryText && (
                  <button
                    onClick={() => sendMessage(msg.retryText)}
                    disabled={isLoading}
                    className="px-3 py-1 rounded-lg text-[11px] font-bold
                      text-red-500 dark:text-red-400
                      border border-red-200 dark:border-red-500/30
                      hover:bg-red-50 dark:hover:bg-red-500/10
                      transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Retry
                  </button>
                )}

                {/* Suggested follow-ups */}
                {msg.type === 'ai' && msg.suggestions?.length > 0 && !isLoading && (
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {msg.suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        disabled={isLoading}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold
                          bg-white dark:bg-navy-800
                          text-slate-600 dark:text-navy-300
                          border border-slate-200 dark:border-navy-700/40
                          hover:border-gold/40 hover:text-gold
                          transition-all disabled:opacity-40"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-end gap-2.5 animate-fade-up">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
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
                  hover:bg-gold/10 hover:text-gold
                  border border-slate-200 dark:border-navy-700/40 hover:border-gold/30
                  transition-all disabled:opacity-40 whitespace-nowrap"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Mobile FAQ — collapsible */}
          <details className="lg:hidden mb-3 group">
            <summary className="flex items-center gap-1 text-[11px] font-bold
              text-slate-400 dark:text-navy-500 cursor-pointer
              hover:text-slate-600 dark:hover:text-navy-300 select-none list-none">
              <span className="group-open:hidden">▸</span>
              <span className="hidden group-open:inline">▾</span>
              Frequently Asked Questions
            </summary>
            <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
              {FAQ_ITEMS.map(({ category, question }) => (
                <button
                  key={question}
                  onClick={() => sendMessage(question)}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-[12px]
                    bg-slate-50 dark:bg-navy-800/60
                    border border-slate-200/60 dark:border-navy-700/40 hover:border-gold/30
                    text-slate-600 dark:text-navy-300 hover:text-slate-900 dark:hover:text-white
                    transition-all disabled:opacity-40"
                >
                  <span className="text-[10px] font-black uppercase text-gold mr-2">{category}:</span>
                  {question}
                </button>
              ))}
            </div>
          </details>

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
                ref={textareaRef}
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
                className={[
                  'w-full resize-none overflow-hidden px-4 py-3 pr-10 rounded-2xl text-sm',
                  'bg-slate-50 dark:bg-navy-800',
                  'text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-navy-500',
                  'focus:outline-none focus:ring-2 focus:ring-gold/15',
                  'disabled:opacity-50 disabled:cursor-not-allowed transition-all',
                  overLimit
                    ? 'border-2 border-red-400 dark:border-red-500 focus:border-red-400'
                    : 'border border-slate-200 dark:border-navy-700/50 focus:border-gold/60',
                ].join(' ')}
                style={{ minHeight: 48, lineHeight: '1.5' }}
              />
              <kbd className="absolute right-3 bottom-3 text-[10px] font-mono
                text-slate-400 dark:text-navy-600 select-none hidden sm:block">
                ↵
              </kbd>
            </div>

            {/* Stop button while loading, Send button otherwise */}
            {isLoading ? (
              <button
                onClick={abortRequest}
                aria-label="Stop generating"
                className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center
                  bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400
                  hover:bg-red-200 dark:hover:bg-red-500/30
                  transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <span className="w-3.5 h-3.5 bg-current rounded-sm" aria-hidden="true" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim() || overLimit}
                aria-label="Send message"
                className={[
                  'flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center',
                  'transition-all hover:-translate-y-0.5 active:translate-y-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0',
                  !inputText.trim() || overLimit ? 'bg-slate-200 dark:bg-navy-700' : '',
                ].join(' ')}
                style={
                  inputText.trim() && !overLimit
                    ? { background: 'linear-gradient(135deg, #FFD700 0%, #E6A800 100%)' }
                    : undefined
                }
              >
                <FiSend
                  size={16}
                  className={inputText.trim() && !overLimit ? 'text-navy-900' : 'text-slate-400 dark:text-navy-500'}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>

          {/* Character count + hint */}
          <div className="flex items-center justify-between mt-2.5">
            <p className="text-[10px] text-slate-400 dark:text-navy-600 select-none">
              Enter to send · Shift+Enter for new line · AI responses are based on PKFokam's official data
            </p>
            {inputText.length > 0 && (
              <span className={`text-[10px] font-mono tabular-nums select-none flex-shrink-0 ml-4 ${
                overLimit ? 'text-red-400 font-bold' : 'text-slate-400 dark:text-navy-600'
              }`}>
                {inputText.length}/{MAX_CHARS}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
