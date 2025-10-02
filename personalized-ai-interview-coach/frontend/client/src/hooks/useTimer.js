import { useState, useEffect, useRef } from 'react';

const useTimer = (initialTime = 0) => {
  const [time, setTime] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      // Clear any existing interval to prevent multiple intervals
      clearInterval(intervalRef.current);
      
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(intervalRef.current);
            setIsActive(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    // Cleanup interval on component unmount
    return () => clearInterval(intervalRef.current);
  }, [isActive, time]);

  const startTimer = () => {
    setIsActive(true);
  };
  
  const stopTimer = () => {
    setIsActive(false);
    clearInterval(intervalRef.current);
  };
  
  const resetTimer = (newTime) => {
    clearInterval(intervalRef.current);
    setTime(newTime);
    setIsActive(false);
  };
  
  // Format time for display (e.g., 120 seconds -> "02:00")
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  return { time, isActive, startTimer, stopTimer, resetTimer, formattedTime: formatTime(time) };
};

export default useTimer;
