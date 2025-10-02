import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const SessionHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/sessions`);
        setSessions(response.data);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError('Failed to load session history. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Loading your practice sessions...</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Session History</h1>
          <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-md">
            {error}
          </div>
          <div className="mt-4">
            <Link 
              to="/" 
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Back to Practice
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Your Practice Sessions</h1>
          <Link 
            to="/" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            New Practice
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No practice sessions found.</p>
            <Link 
              to="/" 
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Start practicing now →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => (
              <div 
                key={session._id} 
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 hover:border-blue-500 transition-colors"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-semibold text-blue-400">
                      {session.question}
                    </h2>
                    <div className="flex items-center">
                      <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm font-medium">
                        {session.score}/10
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-400 text-sm mb-1">Your Answer:</p>
                    <p className="bg-gray-900/50 p-3 rounded-md text-gray-200">
                      {session.answer}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Feedback:</p>
                    <p className="bg-gray-900/50 p-3 rounded-md text-gray-200">
                      {session.feedback}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-500">
                      {formatDate(session.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionHistory;
