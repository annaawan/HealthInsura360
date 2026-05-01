// frontend/src/components/CustomerDashboard/ChatbotFloating.js

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { sendMessage, clearConversation } from '../services/geminiChatbot';

function ChatbotFloating() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { type: 'bot', text: "Hi! 👋 I'm your HealthInsura360 AI assistant. How can I help you today? You can ask me about policies, claims, renewals, or coverage!" }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!isOpen) {
            clearConversation();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading) return;
        
        const userMessage = inputText.trim();
        
        setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
        setInputText('');
        setIsLoading(true);
        
        const botReply = await sendMessage(userMessage);
        
        setMessages(prev => [...prev, { type: 'bot', text: botReply }]);
        setIsLoading(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 bg-sky-600 text-white p-4 rounded-full shadow-lg hover:bg-sky-700 transition-all duration-200 ${
                    isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
                }`}
            >
                <MessageCircle className="h-6 w-6" />
            </button>

            {/* Close Button */}
            <button
                onClick={() => setIsOpen(false)}
                className={`fixed bottom-6 right-6 z-50 bg-gray-500 text-white p-4 rounded-full shadow-lg hover:bg-gray-600 transition-all duration-200 ${
                    isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                }`}
            >
                <X className="h-6 w-6" />
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-96 h-[550px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="bg-sky-600 text-white p-4 flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            <span className="font-semibold">AI Assistant</span>
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Gemini AI</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-lg ${
                                        msg.type === 'user'
                                            ? 'bg-sky-600 text-white rounded-br-none'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-200 p-3 flex gap-2 flex-shrink-0">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me about health insurance..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputText.trim() || isLoading}
                            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default ChatbotFloating;