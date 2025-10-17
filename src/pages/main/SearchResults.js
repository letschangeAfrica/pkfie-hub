import React, { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import "./SearchResults.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api/pathfinder";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const SearchResults = () => {
  const query = useQuery().get("q") || "";
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setPrograms([]);
      return;
    }
    setLoading(true);
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/programs/?search=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.status === 401) {
          throw new Error("Unauthorized: Please log in.");
        }
        return res.json();
      })
      .then(data => {
        setPrograms(data);
      })
      .catch(e => {
        console.error("Search error", e);
        setPrograms([]);
      })
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="search-results-section">
      <button
        className="search-back-btn"
        onClick={() => navigate(-1)}
      >
        <span className="search-back-arrow" aria-hidden="true">&larr;</span>
        <span>Back</span>
      </button>
      <h2 className="search-results-title">
        Search Results for <span className="search-query">"{query}"</span>
      </h2>
      {loading && <div className="search-loading">Loading...</div>}
      {!loading && query.trim() !== "" && programs.length === 0 && (
        <div className="no-search-results">No programs found.</div>
      )}
      {!loading && programs.length > 0 && (
        <div className="programs-list">
          {programs.map(program => (
            <Link to={`/programs/${program.code}`} className="program-result-card" key={program.code || program.id}>
              <div className="program-result-header">
                <span className="program-result-title">{program.name}</span>
                <span className="program-result-code">{program.code}</span>
              </div>
              <div className="program-result-description">{program.description}</div>
              <div className="program-result-footer">
                <span className="program-result-years">{program.duration_years} years</span>
                <span className="program-result-fee">Tuition: <strong>${program.tuition_fee}</strong></span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {query.trim() === "" && (
        <div className="no-search-results">Please enter a search above.</div>
      )}
    </div>
  );
};

export default SearchResults;