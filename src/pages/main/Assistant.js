import React, { useState, useRef, useEffect } from 'react';
import './Assistant.css';

const API_URL = "http://localhost:8000/api/chat/chat/ai/";

const Assistant = () => {
  // State for chat messages
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm the PKFConnect Assistant. How can I help you today?",
      time: getCurrentTime()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  // Predefined quick questions
  const quickQuestions = [
    "What are the tuition fees?",
    "How do I apply for scholarships?",
    "What's the application deadline?",
    "What programs are offered?",
    "What are the accommodation options?"
  ];

  // FAQ items
  const faqItems = [
    {
      category: "Admission Requirements",
      question: "What are the requirements for international students?",
    },
    {
      category: "Tuition & Fees",
      question: "Are there additional fees beyond tuition?",
    },
    {
      category: "Scholarships",
      question: "How can I apply for financial aid?",
    },
    {
      category: "Academic Calendar",
      question: "When does the next semester start?",
    }
  ];

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  // Actually send a message (user or quick/FAQ)
  const sendMessage = async (text) => {
    if (text.trim() === '') return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: text,
      time: getCurrentTime()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // INCLUDE JWT TOKEN!
      const token = localStorage.getItem('token');
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: text,
          ...(conversationId && { conversation_id: conversationId }),
        }),
      });

      if (!resp.ok) {
        throw new Error("AI API error");
      }
      const data = await resp.json();

      // Set the conversation id for context
      if (data.conversation_id) setConversationId(data.conversation_id);

      // Add both user and AI messages to chat
      const aiMsg = data.ai_message || data.message || {};
      if (aiMsg.message_text) {
        setMessages(prev => [
          ...prev,
          {
            id: prev.length + 1,
            type: "ai",
            content: aiMsg.message_text,
            time: getCurrentTime()
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: prev.length + 1,
            type: "ai",
            content: "Sorry, I couldn't get a response from the assistant.",
            time: getCurrentTime()
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          type: "ai",
          content: "Sorry, there was an error contacting the AI assistant.",
          time: getCurrentTime()
        }
      ]);
    }
    setIsLoading(false);
  };

  // Handle sending a message from user input
  const handleSendMessage = () => {
    sendMessage(inputText);
  };

  // Handle quick question button click (auto-sends)
  const handleQuickQuestion = (question) => {
    sendMessage(question);
  };

  // Handle FAQ button click (auto-sends)
  const handleFAQClick = (question) => {
    sendMessage(question);
  };

  // Get current time in HH:MM format
  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Handle Enter key press in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading && inputText.trim() !== '') {
      handleSendMessage();
    }
  };

  return (
    <div className="assistant-section">
      {/* Assistant Info Section */}
      <div className="assistant-info">
        <div className="assistant-avatar">
          <i className="fas fa-robot"></i>
        </div>
        <div className="assistant-description">
          <h3>How can I help you today?</h3>
          <p>
            I'm here to answer your questions about PKFokam Institute of Excellence. You can ask me about admissions, programs, fees, policies, or anything else related to the institute.
          </p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((message, idx) => (
            <div key={idx} className={`message ${message.type}-message`}>
              {message.type === 'ai' && (
                <div className="message-avatar">
                  <i className="fas fa-robot"></i>
                </div>
              )}
              <div className="message-content">
                <p>{message.content}</p>
                <span className="message-time">{message.time}</span>
              </div>
              {message.type === 'user' && (
                <div className="message-avatar">
                  <i className="fas fa-user"></i>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="message ai-message">
              <div className="message-avatar">
                <i className="fas fa-robot"></i>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="chat-input-container">
          <div className="chat-input">
            <input
              type="text"
              placeholder="Type your question here..."
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
            />
            <button 
              onClick={handleSendMessage}
              disabled={isLoading || inputText.trim() === ''}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
          <div className="quick-questions">
            <p>Quick questions:</p>
            <div className="quick-question-buttons">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  className="quick-question-btn"
                  onClick={() => handleQuickQuestion(question)}
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-section">
        <h3 className="section-title">Frequently Asked Questions</h3>
        <div className="faq-grid">
          {faqItems.map((faq, index) => (
            <div key={index} className="faq-item">
              <h4>{faq.category}</h4>
              <p>{faq.question}</p>
              <button 
                className="faq-button"
                onClick={() => handleFAQClick(faq.question)}
                disabled={isLoading}
              >
                Ask this question
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Assistant;