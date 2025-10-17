import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

// Accept theme and setTheme props and pass to Header
const Layout = ({ children, theme, setTheme }) => {
  return (
    <>
      <div className="container">
        <Sidebar />
        <main className="main-content">
          <Header theme={theme} setTheme={setTheme} />

          {/* Cultural Divider */}
          <div className="cultural-divider horizontal">
            <div className="adinkra-symbol">⚜</div>
          </div>

          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>PKFConnect - A student-led initiative for transparency and excellence | © 2023</p>
      </footer>
    </>
  );
};

export default Layout;