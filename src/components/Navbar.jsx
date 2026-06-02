import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Menu, X, LogOut, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const menuButtonRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = 'hidden';

    const drawer = document.getElementById('mobile-nav-drawer');
    const firstFocusable = drawer?.querySelector('a, button');
    if (firstFocusable) firstFocusable.focus();

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
      }
    };

    const handleFocusTrap = (e) => {
      if (e.key !== 'Tab') return;
      const modal = document.getElementById('mobile-nav-drawer');
      if (!modal) return;

      const focusable = modal.querySelectorAll(
        'a, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('keydown', handleFocusTrap);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('keydown', handleFocusTrap);
      menuButton?.focus();
    };
  }, [menuOpen]);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      setDarkMode(saved === 'dark');
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;
  const isAppPage = location.pathname === '/app';

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/app', label: 'Console' },
    { to: '/tools', label: 'Tools' },
    { to: '/hosting', label: 'Hosting' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/api-docs', label: 'API' },
  ];

  if (isAppPage) return null;

  return (
    <>
      <nav className="navbar-main">
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-mark" aria-hidden="true">C</span>
          <span className="navbar-logo-word">Cexistore</span>
        </Link>

        {/* Desktop Nav */}
        <div className="nav-desktop">
          <div className="nav-links">
            {navLinks.map(link => (
              <Link 
                key={link.to} 
                to={link.to}
                className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
                aria-current={isActive(link.to) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="nav-actions">
            <button 
              onClick={toggleDark}
              className="nav-theme-toggle"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user ? (
              <div className="nav-auth">
                <Link to="/app" className="btn-gh btn-blue">
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="nav-logout-btn"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="btn-gh btn-signin">
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Hamburger */}
        <div className="nav-hamburger">
          <button 
            onClick={toggleDark}
            className="nav-theme-toggle"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            ref={menuButtonRef}
            onClick={() => setMenuOpen(!menuOpen)}
            className="nav-menu-btn"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu - Slide-in Drawer */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="nav-backdrop"
            onClick={() => setMenuOpen(false)}
            role="presentation"
          />
          
          {/* Slide-in Menu */}
          <div
            id="mobile-nav-drawer"
            className="nav-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="nav-mobile-links">
              {navLinks.map(link => (
                <Link 
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`nav-mobile-link ${isActive(link.to) ? 'active' : ''}`}
                  aria-current={isActive(link.to) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="nav-mobile-footer">
              {user ? (
                <>
                  <Link 
                    to="/app" 
                    onClick={() => setMenuOpen(false)}
                    className="nav-mobile-link primary"
                  >
                    Dashboard
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="nav-mobile-link danger"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link 
                  to="/auth" 
                  onClick={() => setMenuOpen(false)}
                  className="nav-mobile-link"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .navbar-main {
          position: sticky;
          top: 12px;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: min(1120px, calc(100% - 24px));
          margin: 0 auto 10px;
          padding: 10px 14px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.76);
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.76), rgba(255, 255, 255, 0.58));
          backdrop-filter: blur(22px) saturate(130%);
          -webkit-backdrop-filter: blur(22px) saturate(130%);
          box-shadow: 0 14px 36px rgba(15, 23, 42, 0.1);
        }

        [data-theme="dark"] .navbar-main {
          border-color: rgba(148, 163, 184, 0.24);
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.64));
          box-shadow: 0 16px 38px rgba(2, 6, 23, 0.58);
        }

        .navbar-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text-main);
          text-decoration: none;
          white-space: nowrap;
        }

        .navbar-logo-word {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.01em;
          text-transform: uppercase;
        }

        .navbar-logo-mark {
          width: 26px;
          height: 26px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: #fff;
          background: var(--gradient-primary);
          box-shadow: var(--shadow-sm);
        }

        .nav-desktop {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-links {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 3px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.7);
        }

        [data-theme="dark"] .nav-links {
          background: rgba(15, 23, 42, 0.66);
          border-color: rgba(148, 163, 184, 0.24);
        }

        .nav-link {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-sub);
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 999px;
        }

        .nav-link:hover {
          background: var(--primary-light);
          color: var(--primary);
        }

        .nav-link:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        .nav-link.active {
          color: #fff;
          background: var(--gradient-primary);
          box-shadow: var(--shadow-sm);
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-auth {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-theme-toggle {
          background: rgba(255, 255, 255, 0.66);
          border: 1px solid rgba(15, 23, 42, 0.14);
          cursor: pointer;
          color: var(--text-sub);
          padding: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
        }

        .nav-theme-toggle:hover {
          color: var(--primary);
          background: var(--primary-light);
        }

        .nav-theme-toggle:focus-visible,
        .nav-logout-btn:focus-visible,
        .nav-menu-btn:focus-visible,
        .nav-mobile-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        [data-theme="dark"] .nav-theme-toggle {
          background: rgba(15, 23, 42, 0.72);
          border-color: rgba(148, 163, 184, 0.24);
        }

        .nav-logout-btn {
          background: rgba(255, 255, 255, 0.66);
          border: 1px solid rgba(15, 23, 42, 0.14);
          cursor: pointer;
          color: var(--text-sub);
          padding: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
        }

        .nav-logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }

        .btn-signin {
          color: #fff !important;
          background: var(--gradient-primary) !important;
          border-color: transparent !important;
          box-shadow: var(--shadow-sm);
        }

        /* Mobile Navigation */
        .nav-hamburger {
          display: none;
          align-items: center;
          gap: 8px;
        }

        .nav-menu-btn {
          background: rgba(255, 255, 255, 0.66);
          border: 1px solid rgba(15, 23, 42, 0.14);
          cursor: pointer;
          padding: 7px;
          color: var(--text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
        }

        .nav-menu-btn:hover {
          background: var(--primary-light);
          color: var(--primary);
        }

        [data-theme="dark"] .nav-menu-btn {
          background: rgba(15, 23, 42, 0.72);
          border-color: rgba(148, 163, 184, 0.24);
        }

        .nav-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.35);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 998;
          animation: fadeIn 0.3s ease-out;
        }

        .nav-mobile-menu {
          position: fixed;
          top: 0;
          left: 0;
          width: min(360px, 86vw);
          height: 100dvh;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.78));
          z-index: 999;
          display: flex;
          flex-direction: column;
          padding-top: 86px;
          animation: slideInLeft 0.24s ease-out;
          border-right: 1px solid rgba(255, 255, 255, 0.68);
          box-shadow: 0 20px 44px rgba(15, 23, 42, 0.3);
          backdrop-filter: blur(18px) saturate(130%);
          -webkit-backdrop-filter: blur(18px) saturate(130%);
          overflow-y: auto;
        }

        [data-theme="dark"] .nav-mobile-menu {
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.76));
          border-color: rgba(148, 163, 184, 0.24);
        }

        .nav-mobile-links {
          display: flex;
          flex-direction: column;
          padding: 14px 8px;
          border-bottom: 1px solid var(--gray-border);
        }

        [data-theme="dark"] .nav-mobile-links {
          border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        .nav-mobile-link {
          font-size: 15px;
          font-weight: 600;
          padding: 13px 14px;
          color: var(--text-main);
          text-decoration: none;
          transition: all 0.2s;
          border-radius: 12px;
          border-left: none;
        }

        .nav-mobile-link:hover {
          background: var(--primary-light);
          color: var(--primary);
        }

        .nav-mobile-link:focus-visible {
          background: var(--primary-light);
          color: var(--primary);
        }

        .nav-mobile-link.active {
          color: #fff;
          background: var(--gradient-primary);
          font-weight: 700;
        }

        .nav-mobile-link.primary {
          color: #fff;
          font-weight: 700;
          background: var(--gradient-primary);
        }

        .nav-mobile-link.danger {
          color: var(--danger);
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
        }

        .nav-mobile-footer {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 14px 8px;
          margin-top: auto;
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        /* Responsive */
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .navbar-main {
            width: calc(100% - 16px);
            padding: 9px 10px;
            top: 8px;
          }
          .navbar-logo-word {
            font-size: 14px;
          }
        }

        @media (max-width: 380px) {
          .navbar-main {
            width: calc(100% - 10px);
          }
          .nav-theme-toggle,
          .nav-menu-btn {
            padding: 5px;
          }
        }
      `}</style>
    </>
  );
}
