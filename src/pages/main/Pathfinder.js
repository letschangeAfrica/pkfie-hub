import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Pathfinder.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/pathfinder';

const Pathfinder = () => {
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [programs, setPrograms] = useState({});
  const [loading, setLoading] = useState(true);
  const [backendResults, setBackendResults] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('You must log in to access Pathfinder.');
          setLoading(false);
          return;
        }
        const qRes = await fetch(`${API_BASE}/questions/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!qRes.ok) throw new Error('Unable to fetch questions');
        const questionsData = await qRes.json();

        const pRes = await fetch(`${API_BASE}/programs/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!pRes.ok) throw new Error('Unable to fetch programs');
        const programsData = await pRes.json();
        const programsObj = {};
        programsData.forEach(prog => {
          programsObj[prog.code || prog.id] = prog;
        });

        setQuestions(questionsData);
        setPrograms(programsObj);
      } catch (e) {
        alert('Error loading Pathfinder data.');
        console.error(e);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setBackendResults(null);
  };

  const handleAnswerSelect = (optionId) => {
    setAnswers({
      ...answers,
      [currentQuestion]: optionId
    });
  };

  const goToNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults();
    }
  };

  const goToPrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateResults = async () => {
    setShowResults(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must log in to save Pathfinder results.');
        return;
      }
      const sessionRes = await fetch(`${API_BASE}/sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed: true, results: {} })
      });
      if (!sessionRes.ok) throw new Error('Unable to create session');
      const session = await sessionRes.json();

      const answersPayload = Object.entries(answers).map(([qIndex, optId]) => {
        const question = questions[qIndex];
        const optionObj = question?.options?.find(o => o.id === optId || o.option_value === optId);
        return {
          question: question.id,
          option: optionObj?.id,
          answer_value: optionObj?.option_value || optId
        };
      });
      const answersRes = await fetch(`${API_BASE}/sessions/${session.id}/answers/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: answersPayload })
      });
      if (!answersRes.ok) throw new Error('Unable to save answers');
      const answersData = await answersRes.json();
      setBackendResults(answersData.results?.program_matches || null);
    } catch (e) {
      console.error('Error saving session/answers:', e);
    }
  };

  const restartQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setBackendResults(null);
  };

  // Fallback scoring if backend is unavailable
  const getProgramMatches = () => {
    const scores = {};
    Object.values(programs).forEach(prog => {
      scores[prog.code || prog.id] = 0;
    });

    Object.entries(answers).forEach(([qIndex, optId]) => {
      const question = questions[qIndex];
      const selectedOption = question?.options?.find(o => o.id === optId || o.option_value === optId);
      if (selectedOption && selectedOption.program_weights) {
        Object.entries(selectedOption.program_weights).forEach(([code, weight]) => {
          scores[code] = (scores[code] || 0) + weight;
        });
      }
    });

    const maxPossibleScore = questions.length * 3;
    const programMatches = Object.keys(scores).map(code => {
      const prog = programs[code];
      if (!prog) return null;
      const matchPercent = Math.min(100, Math.round((scores[code] / maxPossibleScore) * 100));
      return { ...prog, match: matchPercent };
    }).filter(Boolean);

    return programMatches.sort((a, b) => b.match - a.match);
  };

  const getProgressPercentage = () => {
    return ((currentQuestion + 1) / questions.length) * 100;
  };

  const renderQuestion = () => {
    const question = questions[currentQuestion];
    if (!question) return null;
    return (
      <div className="question-container">
        <h3 className="question-text">{question.question_text}</h3>
        <div className="options-container">
          {question.options.map(option => (
            <button
              key={option.id}
              className={`option-button ${answers[currentQuestion] === option.id ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(option.id)}
            >
              {option.option_text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Improved: Each button links to the CORRECT program code, and colors are inherited from CSS vars
  const renderResults = () => {
    const programMatches = backendResults || getProgramMatches();
    if (!programMatches || programMatches.length === 0) return null;
    const topProgram = programMatches[0];
    const otherPrograms = programMatches.slice(1, 4);

    return (
      <div className="results-container">
        <div className="results-header">
          <h3>Your Recommended Program</h3>
          <p>Based on your interests and skills, we recommend:</p>
        </div>
        <div className="program-result">
          <div className="program-card featured">
            <div className="program-icon">
              <i className={topProgram.icon || 'fas fa-book'}></i>
            </div>
            <div className="program-details">
              <h4>{topProgram.name}</h4>
              <p className="program-match">{topProgram.match}% Match</p>
              <p>{topProgram.description}</p>
              <div className="program-skills">
                {topProgram.skills?.map(skill => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
              <Link to={`/programs/${topProgram.code || topProgram.id}`} className="program-link">
                View Program Details <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        </div>
        <div className="other-programs">
          <h4>Other Programs You Might Like</h4>
          <div className="programs-grid">
            {otherPrograms.map(program => (
              <div key={program.code || program.id} className="program-card small">
                <div className="program-icon">
                  <i className={program.icon || 'fas fa-book'}></i>
                </div>
                <div className="program-details">
                  <h5>{program.name}</h5>
                  <p className="program-match">{program.match}% Match</p>
                  <Link to={`/programs/${program.code || program.id}`} className="program-link">
                    Learn more <i className="fas fa-arrow-right"></i>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="results-actions">
          <button id="restart-quiz" className="cta-button" onClick={restartQuiz}>
            <i className="fas fa-redo"></i> Take Again
          </button>
          <Link to={`/programs/${topProgram.code || topProgram.id}`} className="cta-button secondary">
            <i className="fas fa-book"></i> View Program Details
          </Link>
        </div>
      </div>
    );
  };

  const renderProgramsOverview = () => (
    <div className="programs-overview">
      <h3 className="section-title">Explore All Programs</h3>
      <div className="programs-grid">
        {Object.values(programs).map(program => (
          <div key={program.id} className="program-card">
            <div className="program-icon">
              <i className={program.icon || 'fas fa-book'}></i>
            </div>
            <div className="program-details">
              <h4>{program.name}</h4>
              <p>{program.description}</p>
              <Link to={`/programs/${program.code || program.id}`} className="program-link">
                Learn more <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="pathfinder-section">
      {!quizStarted && !showResults && (
        <div className="pathfinder-intro">
          <div className="pathfinder-hero">
            <h3>Find Your Academic Path</h3>
            <p>Take our short assessment to discover which PKFokam program best matches your interests, skills, and career aspirations. Your educational journey starts here.</p>
            <button id="start-quiz" className="cta-button" onClick={startQuiz}>
              <i className="fas fa-play"></i> Start Assessment
            </button>
          </div>
          <div className="pathfinder-image">
            <i className="fas fa-compass"></i>
          </div>
        </div>
      )}

      {quizStarted && !showResults && (
        <div className="quiz-container">
          <div className="quiz-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            <span className="progress-text">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>

          <div className="quiz-content">
            {renderQuestion()}
            <div className="quiz-navigation">
              <button 
                className="nav-button" 
                onClick={goToPrevQuestion}
                disabled={currentQuestion === 0}
              >
                <i className="fas fa-arrow-left"></i> Previous
              </button>
              <button 
                className="nav-button" 
                onClick={goToNextQuestion}
                disabled={!answers[currentQuestion]}
              >
                {currentQuestion === questions.length - 1 ? 'See Results' : 'Next'} 
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {showResults && renderResults()}
      {renderProgramsOverview()}
    </div>
  );
};

export default Pathfinder;