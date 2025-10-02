import { useState, useEffect, useRef } from 'react';

const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if the browser supports the Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    // Configure recognition settings
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    // Handle results
    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }
      
      // Only update with final results to prevent duplicates
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript + ' ');
      }
    };

    // Handle errors
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not initialized');
      return false;
    }
    
    // Don't start if already listening
    if (isListening) return false;
    
    try {
      // Reset any previous error
      setError(null);
      
      // Ensure any previous recognition is stopped
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping already stopped recognition
        }
      }
      
      // Reset the recognition instance to prevent 'already started' errors
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition settings
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      // Set a timeout for no-speech detection
      let timeoutId;
      const NO_SPEECH_TIMEOUT = 5000; // 5 seconds
      
      // Re-attach event handlers
      recognitionRef.current.onstart = () => {
        // Set a timeout to detect no-speech
        timeoutId = setTimeout(() => {
          if (!transcript) { // If no speech was detected yet
            setError('No speech detected. Please speak clearly.');
            stopListening();
          }
        }, NO_SPEECH_TIMEOUT);
      };
      
      recognitionRef.current.onresult = (event) => {
        // Clear the no-speech timeout when we get any result
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript + ' ');
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        // Don't show 'no-speech' error as it's handled by our timeout
        if (event.error !== 'no-speech') {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
        if (timeoutId) clearTimeout(timeoutId);
      };
      
      // Clear any previous transcript
      setTranscript('');
      
      // Start listening
      recognitionRef.current.start();
      setIsListening(true);
      return true;
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('Error starting speech recognition. Please try again.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      // Add a new line for the next speech segment
      setTranscript(prev => prev + '\n\n');
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    // Also clear any ongoing recognition
    if (isListening) {
      stopListening();
      startListening();
    }
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
};

export default useSpeechRecognition;
