import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from './Icons';

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

interface FinancialCopilotProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const FinancialCopilot: React.FC<FinancialCopilotProps> = ({ messages, onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 animate-fade-in-up">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Financial Copilot</h3>
      <div className="h-96 flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-lg'}`}>
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-700 rounded-bl-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '75ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && !isLoading && (
          <div className="px-4 pb-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleSuggestionClick("What was my single biggest expense?")} className="suggestion-chip">Biggest expense?</button>
                  <button onClick={() => handleSuggestionClick("How much did I spend on Food & Dining?")} className="suggestion-chip">Spending on Food?</button>
                  <button onClick={() => handleSuggestionClick("Show me all transactions over 5000.")} className="suggestion-chip">Transactions &gt; 5000?</button>
              </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your finances..."
              className="w-full bg-gray-100 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 rounded-full py-2 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
       <style>{`
            .suggestion-chip {
                @apply px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors;
            }
        `}</style>
    </div>
  );
};

export default FinancialCopilot;