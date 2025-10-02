import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ResumeUploader = () => {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please upload a valid PDF file');
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a PDF file first');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(
        '${import.meta.env.VITE_API_URL}/api/generate-from-resume',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setQuestions(response.data.questions);
    } catch (err) {
      console.error('Error uploading resume:', err);
      setError(
        err.response?.data?.error ||
          'Failed to process resume. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (question) => {
    // Reset any existing state and navigate to home with the selected question
    navigate('/', { 
      state: { 
        question,
        // Reset other states as needed
        timerReset: true,
        resetTranscript: true
      } 
    });
    
    // Force a page reload to ensure the question is properly loaded
    window.scrollTo(0, 0);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">
        Generate Interview Questions from Your Resume
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="resume-upload"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Upload your resume (PDF only, max 5MB)
          </label>
          <input
            type="file"
            id="resume-upload"
            accept=".pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              file:cursor-pointer"
            disabled={isLoading}
          />
          {file && (
            <p className="mt-2 text-sm text-gray-300">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!file || isLoading}
          className={`w-full py-3 px-4 rounded-md font-medium text-white ${
            !file || isLoading
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 transition-colors'
          }`}
        >
          {isLoading ? 'Generating Questions...' : 'Generate Questions'}
        </button>

        {error && (
          <div className="p-3 mt-4 text-red-300 bg-red-900/50 rounded-md">
            {error}
          </div>
        )}
      </form>

      {questions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-white mb-4">
            Generated Questions:
          </h3>
          <ul className="space-y-3">
            {questions.map((question, index) => (
              <li
                key={index}
                onClick={() => handleQuestionClick(question)}
                className="p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
              >
                <p className="text-gray-200">{question}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click to practice this question
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResumeUploader;
