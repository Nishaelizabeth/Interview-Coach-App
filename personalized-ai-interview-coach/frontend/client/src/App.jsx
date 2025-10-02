import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import QuestionGenerator from './components/QuestionGenerator';
import SessionHistory from './components/SessionHistory';
import ResumeUploader from './components/ResumeUploader';

const App = () => {
  const [isListening, setIsListening] = useState(false);
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">
        <nav className="bg-gray-800 shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-blue-400">
                  AI Interview Coach
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link 
                  to="/" 
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Practice
                </Link>
                <Link 
                  to="/history" 
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  History
                </Link>
                <Link 
                  to="/resume" 
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Resume Analysis
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4">
          <Routes>
            <Route 
              path="/" 
              element={
                <div>
                  <h1 className="text-3xl font-bold text-center my-8 text-blue-400">Practice Interview Questions</h1>
                  <QuestionGenerator isListening={isListening} />
                </div>
              } 
            >
              <Route 
                index 
                element={
                  <div>
                    <h1 className="text-3xl font-bold text-center my-8 text-blue-400">Practice Interview Questions</h1>
                    <QuestionGenerator isListening={isListening} />
                  </div>
                } 
              />
            </Route>
            <Route 
              path="/history" 
              element={<SessionHistory />} 
            />
            <Route 
              path="/resume" 
              element={
                <div>
                  <h1 className="text-3xl font-bold text-center my-8 text-blue-400">Resume Analysis</h1>
                  <ResumeUploader />
                </div>
              } 
            />
          </Routes>
        </main>
        
        <footer className="mt-12 py-4 text-center text-gray-500 text-sm border-t border-gray-800">
          <p>AI Interview Coach - Practice with AI-generated questions</p>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
