import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./ProgramDetail.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api/pathfinder";

const ProgramDetail = () => {
  const { code } = useParams();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProgram() {
      setLoading(true);
      setProgram(null);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/programs/?code=${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Fix: find the correct program in the array
      const found = data.find(p => String(p.code).toLowerCase() === String(code).toLowerCase());
      setProgram(found || null);
      setLoading(false);
    }
    fetchProgram();
  }, [code]);

  if (loading) return <div className="pf-program-detail-loading">Loading...</div>;
  if (!program) return <div className="pf-program-detail-notfound">Program not found.</div>;

  return (
    <div className="pf-program-detail-container">
      <div className="pf-program-detail-topbar">
        <button className="pf-back-link" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
      <div className="pf-program-detail-header">
        <h1>{program.name}</h1>
        <span className="pf-program-detail-code">{program.code}</span>
        <p className="pf-program-detail-description">{program.description}</p>
      </div>
      <div className="pf-program-detail-maininfo">
        <div className="pf-program-detail-section">
          <h3>Duration</h3>
          <p>{program.duration_years} years</p>
        </div>
        <div className="pf-program-detail-section">
          <h3>Requirements</h3>
          <p>{program.requirements}</p>
        </div>
        <div className="pf-program-detail-section">
          <h3>Career Opportunities</h3>
          <p>{program.career_opportunities}</p>
        </div>
        <div className="pf-program-detail-section">
          <h3>Tuition & Fees</h3>
          <p>
            Tuition Fee: <strong>${program.tuition_fee}</strong>
            <br />
            Additional Fees: <strong>${program.additional_fees}</strong>
          </p>
        </div>
      </div>
      {program.features && program.features.length > 0 && (
        <div className="pf-program-detail-features">
          <h3>Program Features</h3>
          <ul>
            {program.features.map(f =>
              <li key={f.id}>
                <strong>{f.feature_name}</strong>
                {f.feature_description && <>: {f.feature_description}</>}
              </li>
            )}
          </ul>
        </div>
      )}
      <div className="pf-program-detail-actions">
        <Link to="/pathfinder" className="pf-cta-button secondary">
          <i className="fas fa-compass"></i> Take Pathfinder Quiz Again
        </Link>
        <a
          href={`mailto:admissions@youruniversity.edu?subject=Interested in ${program.name}`}
          className="pf-cta-button"
        >
          <i className="fas fa-envelope"></i> Contact Admissions
        </a>
      </div>
    </div>
  );
};

export default ProgramDetail;