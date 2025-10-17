import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { marked } from 'marked';
import './Handbook.css';

// Helper to wrap images for consistent design
function wrapImages(html) {
  return html.replace(
    /<img([^>]*)>/g,
    '<div class="handbook-img-wrapper"><img$1></div>'
  );
}

const tocItems = [
  { id: 'admissions', icon: 'fas fa-user-graduate', label: 'Admissions & Enrollment' },
  { id: 'academics', icon: 'fas fa-book-open', label: 'Academic Programs' },
  { id: 'fees', icon: 'fas fa-money-bill-wave', label: 'Tuition & Fees' },
  { id: 'policies', icon: 'fas fa-scale-balanced', label: 'Policies & Procedures' },
  { id: 'campus', icon: 'fas fa-building', label: 'Campus Life' },
  { id: 'resources', icon: 'fas fa-hands-helping', label: 'Student Resources' }
];

const Handbook = () => {
  const [activeSection, setActiveSection] = useState('admissions');
  const [handbookData, setHandbookData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [fadeKey, setFadeKey] = useState('admissions');

  useEffect(() => {
    setFadeKey(activeSection);
    const fetchSection = async () => {
      setLoading(true);
      setError('');
      setActionMessage('');
      try {
        const res = await api.get(`/handbook/${activeSection}/`);
        setHandbookData(prev => ({ ...prev, [activeSection]: res.data }));
      } catch (err) {
        setError('Failed to load section.');
      } finally {
        setLoading(false);
      }
    };

    if (!handbookData[activeSection]) {
      fetchSection();
    }
  }, [activeSection, handbookData]);

  const handleApplyNow = async () => {
    setActionMessage('');
    try {
      await api.post('/applications/start/');
      setActionMessage("Application started! Check your email for next steps.");
    } catch {
      setActionMessage("Failed to start application. Please try again.");
    }
  };

  const handleContactFinance = () => {
    window.location.href = "mailto:finance@pkfokam-institute.com";
  };

  const renderSection = () => {
    if (loading) return <div className="handbook-loading">Loading...</div>;
    if (error) return <div className="handbook-error">{error}</div>;

    const content = handbookData[activeSection];
    if (!content) return null;

    return (
      <div>
        <h4 className="handbook-title">{content.title}</h4>

        {/* Render Content Blocks */}
        {content.blocks && content.blocks.length > 0 && (
          content.blocks
            .sort((a, b) => a.order - b.order)
            .map((block, i) => (
              <div className="handbook-block modern-card" key={i}>
                {block.title && <h5>{block.title}</h5>}
                <div
                  className="handbook-block-body"
                  dangerouslySetInnerHTML={{
                    __html: wrapImages(marked.parse(block.body || ""))
                  }}
                />
              </div>
            ))
        )}

        {/* Render Tables */}
        {content.tables && content.tables.length > 0 && (
          content.tables
            .sort((a, b) => a.order - b.order)
            .map((table, i) => {
              const sortedRows = table.rows.sort((a, b) => a.order - b.order);
              const headerRow = sortedRows.length > 0 ? sortedRows[0] : null;
              const dataRows = sortedRows.slice(1);

              return (
                <div className="handbook-table-section modern-card" key={i}>
                  {table.title && <h5>{table.title}</h5>}
                  <div className="table-container large-table-container">
                    <table className="handbook-table large-handbook-table">
                      <thead>
                        {headerRow && (
                          <tr>
                            {headerRow.values.map((cell, k) => (
                              <th key={k}>{cell}</th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {dataRows.map((row, j) => (
                          <tr key={j}>
                            {row.values.map((cell, k) => (
                              <td key={k}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
        )}

        {/* Example extra actions for certain sections */}
        {activeSection === 'admissions' && (
          <button className="handbook-action-btn" onClick={handleApplyNow}>
            <i className="fas fa-paper-plane"></i> Apply Now
          </button>
        )}
        {activeSection === 'fees' && (
          <button className="handbook-action-btn" onClick={handleContactFinance}>
            <i className="fas fa-envelope"></i> Contact Finance
          </button>
        )}
        {actionMessage && <div className="handbook-action-msg">{actionMessage}</div>}
      </div>
    );
  };

  return (
    <div className="handbook-content">
      <div className="toc-container">
        <h3 className="toc-title">Table of Contents</h3>
        <div className="toc-grid">
          {tocItems.map(item => (
            <button
              key={item.id}
              className={`toc-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="handbook-main">
        <section className="handbook-section handbook-fade" key={fadeKey}>
          <h3 className="section-title">
            <i className={tocItems.find(x => x.id === activeSection)?.icon}></i>
            {tocItems.find(x => x.id === activeSection)?.label}
          </h3>
          {renderSection()}
        </section>
      </div>
    </div>
  );
};

export default Handbook;