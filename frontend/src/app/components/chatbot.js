"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './Chatbot.module.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { text: 'Hello! How can I assist you today?', sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
    } catch (error) {
      console.error("Scroll error:", error);
    }
  };

  useEffect(() => {
    scrollToBottom();
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim()) {
      const userMessage = {
        text: input,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages([...messages, userMessage]);
      setInput('');
      setIsTyping(true);

      try {
        const response = await fetch('http://localhost:8000/chatbot/generate-content/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: input })
        });
        const data = await response.json();
        
        // Handle the different response formats
        if (data.answers) {
          // Handle the knowledge base responses (array of answers)
          data.answers.forEach((answer) => {
            const botMessage = {
              title: answer.title,
              text: answer.content,
              sender: 'bot',
              timestamp: new Date(),
              isKnowledgeAnswer: true
            };
            setMessages(prev => [...prev, botMessage]);
          });
        } else if (data.text) {
          // Handle the regular AI text response
          const botMessage = {
            text: data.text,
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMessage]);
        }
      } catch (error) {
        console.error("Error generating content:", error);
        const botMessage = {
          text: "Sorry, I encountered an error. Please try again later.",
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  // Add a function to handle clicking on a knowledge answer
  const handleAnswerClick = async (title, content) => {
    // Use the content as the input data
    const clickedText = content;
    
    // Create a user message
    const userMessage = {
      text: clickedText,
      sender: 'user',
      timestamp: new Date()
    };
    
    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    
    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Send the clicked content as the prompt
      const response = await fetch('http://localhost:8000/chatbot/generate-content/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: clickedText })
      });
      
      const data = await response.json();
      
      // Handle the response
      if (data.answers) {
        data.answers.forEach((answer) => {
          const botMessage = {
            title: answer.title,
            text: answer.content,
            sender: 'bot',
            timestamp: new Date(),
            isKnowledgeAnswer: true
          };
          setMessages(prev => [...prev, botMessage]);
        });
      } else if (data.text) {
        const botMessage = {
          text: data.text,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error("Error generating content:", error);
      const botMessage = {
        text: "Sorry, I encountered an error. Please try again later.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`${styles.chatbotWrapper} ${isOpen ? styles.open : ''}`}>
      {!isOpen ? (
        <button className={styles.chatbotToggleButton} onClick={toggleChat}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Need help?</span>
        </button>
      ) : (
        <div className={styles.chatbotContainer}>
          <header className={styles.chatbotHeader}>
            <div className={styles.headerContent}>
              <div className={styles.botAvatar}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8"></path>
                  <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                  <path d="M2 14h2"></path>
                  <path d="M20 14h2"></path>
                  <path d="M15 13v2"></path>
                  <path d="M9 13v2"></path>
                </svg>
              </div>
              <div className={styles.headerText}>
                <h3>Support Assistant</h3>
                <p className={styles.status}>
                  <span className={styles.statusIndicator}></span>
                  {isTyping ? 'Typing...' : 'Online'}
                </p>
              </div>
            </div>
            <button className={styles.closeButton} onClick={toggleChat}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          <div className={styles.chatbotMessages}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${styles.message} ${
                  message.sender === 'user' ? styles.userMessage : styles.botMessage
                }`}
              >
                {message.sender === 'bot' && (
                  <div className={styles.botAvatarSmall}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 8V4H8"></path>
                      <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                      <path d="M2 14h2"></path>
                      <path d="M20 14h2"></path>
                      <path d="M15 13v2"></path>
                      <path d="M9 13v2"></path>
                    </svg>
                  </div>
                )}
                <div className={styles.messageContent}>
                  {message.isKnowledgeAnswer ? (
                    <div 
                      className={styles.knowledgeAnswer}
                      onClick={() => handleAnswerClick(message.title, message.text)}
                    >
                      <h4 className={styles.answerTitle}>
                        {message.title}
                        <span className={styles.clickHint}>→</span>
                      </h4>
                      <p>{message.text}</p>
                    </div>
                  ) : (
                    message.text
                  )}
                  <div className={styles.messageTime}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className={`${styles.message} ${styles.botMessage}`}>
                <div className={styles.botAvatarSmall}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H8"></path>
                    <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                    <path d="M2 14h2"></path>
                    <path d="M20 14h2"></path>
                    <path d="M15 13v2"></path>
                    <path d="M9 13v2"></path>
                  </svg>
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className={styles.chatbotInputContainer}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={styles.chatbotInput}
              placeholder="Type your message..."
              autoFocus
              ref={inputRef}
            />
            <button
              type="submit"
              className={styles.chatbotSendButton}
              disabled={!input.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
