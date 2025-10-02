import { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useTimer from '../hooks/useTimer';
// import { usePractice } from '../context/PracticeContext';

const QuestionGenerator = ({ isListening: isListeningProp }) => {
  const location = useLocation();
  // const { currentQuestion, updateQuestion } = usePractice();
  const [generatedQuestion, setGeneratedQuestion] = useState(
    location.state?.initialQuestion || ''
  );
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluationError, setEvaluationError] = useState('');
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);
  const [duration, setDuration] = useState(120);
  const { time, isActive, startTimer, stopTimer, resetTimer, formattedTime } = useTimer(duration);
  
  // Get speech recognition functions
  const { 
    isListening,
    transcript, 
    resetTranscript, 
    startListening, 
    stopListening, 
    error: speechError 
  } = useSpeechRecognition();
  
  // Handle stop listening with proper cleanup
  const handleStopListening = () => {
    stopListening();
    stopTimer();
  };
  
  // Toggle recording state
  const toggleRecording = () => {
    if (isListening) {
      handleStopListening();
    } else {
      // Reset any previous transcript and errors
      resetTranscript();
      setError('');
      
      // Start listening and timer
      const started = startListening();
      if (started) {
        resetTimer(duration);
        startTimer();
      }
    }
  };

  const handleEvaluateAnswer = async () => {
    if (!transcript.trim()) return;
    
    setIsEvaluating(true);
    setEvaluationError('');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/evaluate-answer`,
        {
          question: generatedQuestion,
          answer: transcript.trim()
        }
      );
      
      setEvaluation(response.data);
      if (isListening) {
        stopListening();
      }
      stopTimer();
    } catch (error) {
      console.error('Error evaluating answer:', error);
      setEvaluationError('Failed to evaluate answer. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGenerateFollowUp = async () => {
    if (!transcript.trim()) return;
    
    setIsGeneratingFollowUp(true);
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/generate-follow-up`,
        {
          originalQuestion: generatedQuestion,
          previousAnswer: transcript.trim()
        }
      );
      
      // Set the new follow-up question
      setGeneratedQuestion(response.data.followUpQuestion);
      // Clear the previous answer and evaluation
      resetTranscript();
      setEvaluation(null);
      // Reset the timer
      resetTimer(duration);
      // Start the timer for the new question
      startTimer();
    } catch (error) {
      console.error('Error generating follow-up question:', error);
      setError('Failed to generate follow-up question. Please try again.');
    } finally {
      setIsGeneratingFollowUp(false);
    }
  };

  const handleGenerateQuestion = async (e) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/generate-question`, {
        topic: topic.trim()
      });
    
      
      const newQuestion = response.data.question;
      setGeneratedQuestion(newQuestion);
      resetTimer(duration);
      setTimeout(() => {
        startTimer();
      }, 0);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">AI Interview Question Generator</h2>
      
      <form onSubmit={handleGenerateQuestion} className="space-y-4">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-1">
            Enter a topic:
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="e.g., leadership, teamwork, problem-solving"
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !topic.trim()}
          className={`w-full py-3 px-4 rounded-md font-medium text-white ${
            isLoading || !topic.trim()
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 transition-colors'
          }`}
        >
          {isLoading ? 'Generating...' : 'Generate AI Question'}
        </button>
      </form>

      <div className="mt-8">
        {isLoading && (
          <div className="text-center py-4">
            <p className="text-gray-300">Generating your question...</p>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-md">
            <p className="text-red-300">{error}</p>
          </div>
        )}
        
        {generatedQuestion && (
          <div className="mt-6 space-y-6">
            <div className="p-6 bg-gray-700 rounded-lg">
              <h3 className="text-lg font-medium text-gray-300 mb-2">Your Question:</h3>
              <p className="text-xl italic text-white">"{generatedQuestion}"</p>
            </div>

            {/* Speech Recognition Controls */}
            <div className="space-y-6">
              {/* Timer Display */}
              <div className="text-center">
                <div className={`text-5xl font-bold mb-2 ${time < 16 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {formattedTime}
                </div>
                <p className="text-sm text-gray-400">Time remaining</p>
              </div>

              {/* Duration Selector */}
              <div className="flex justify-center">
                <div className="bg-gray-700 p-3 rounded-lg">
                  <label htmlFor="duration" className="text-sm text-gray-300 mr-2">Answer Time:</label>
                  <select 
                    id="duration"
                    value={duration / 60}
                    onChange={(e) => {
                      const newDuration = Number(e.target.value) * 60;
                      setDuration(newDuration);
                      resetTimer(newDuration);
                    }}
                    disabled={isActive || isListening}
                    className="bg-gray-800 text-white rounded p-1 text-sm"
                  >
                    <option value="1">1 minute</option>
                    <option value="2">2 minutes</option>
                    <option value="3">3 minutes</option>
                    <option value="5">5 minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={time === 0 && !isListening}
                    className={`px-6 py-3 rounded-md font-medium text-white transition-all ${
                      isListening 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : time === 0
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                    } flex items-center gap-2 min-w-[180px] justify-center`}
                  >
                    {isListening ? (
                      <>
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                        </svg>
                        Record Answer
                      </>
                    )}
                  </button>
                  
                  {transcript && !isListening && (
                    <button
                      type="button"
                      onClick={resetTranscript}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      Clear
                    </button>
                  )}
                </div>
                
                {isListening && (
                  <div className="text-sm text-blue-400 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Listening... Speak now
                  </div>
                )}
              </div>

              {/* Transcript Display */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-300">
                    Your Response {isListening && <span className="text-red-500 animate-pulse">(Listening...)</span>}
                  </label>
                  {transcript && (
                    <button
                      type="button"
                      onClick={resetTranscript}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      title="Clear transcript"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div 
                  className="w-full min-h-32 p-4 bg-gray-800 border border-gray-600 rounded-md text-white whitespace-pre-wrap overflow-y-auto transition-all duration-200"
                  style={{ 
                    minHeight: '8rem', 
                    maxHeight: '300px',
                    borderColor: isListening ? '#3b82f6' : '#4b5563',
                    boxShadow: isListening ? '0 0 0 1px #3b82f6' : 'none'
                  }}
                >
                  {transcript || (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      {isListening 
                        ? <span className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Listening... Start speaking
                          </span>
                        : 'Click the record button and start speaking. Your response will appear here.'
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Speech recognition error */}
              {speechError && (
                <div className="mt-2 p-2 text-red-400 text-sm bg-red-900/30 rounded">
                  {speechError}
                </div>
              )}

              {/* Evaluation Button */}
              <div className="mt-6">
                <button
                  onClick={handleEvaluateAnswer}
                  disabled={!transcript.trim() || isEvaluating}
                  className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                    !transcript.trim() || isEvaluating
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 transition-colors'
                  }`}
                >
                  {isEvaluating ? 'Evaluating...' : '✅ Evaluate Answer'}
                </button>
              </div>

              {/* Evaluation Results */}
              {evaluationError && (
                <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-md">
                  <p className="text-red-300">{evaluationError}</p>
                </div>
              )}

              {isEvaluating && (
                <div className="mt-6 p-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-300">Evaluating your answer...</p>
                </div>
              )}

              {evaluation && (
                <div className="space-y-6">
                  <div className="p-6 bg-gray-700 rounded-lg">
                    <h3 className="text-xl font-semibold text-white mb-4">Your Evaluation</h3>
                    <div className="mb-4">
                      <span className="text-2xl font-bold text-blue-400">
                        Score: {evaluation.score}/10
                      </span>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-md">
                      <p className="text-gray-200">{evaluation.feedback}</p>
                    </div>
                  </div>
                  
                  {/* Follow-up Question Button */}
                  <button
                    onClick={handleGenerateFollowUp}
                    disabled={isGeneratingFollowUp}
                    className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                      isGeneratingFollowUp
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 transition-colors'
                    }`}
                  >
                    {isGeneratingFollowUp ? 'Generating...' : '🔍 Ask a Follow-Up Question'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionGenerator;
