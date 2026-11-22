import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FaUser, FaSignInAlt, FaSignOutAlt, FaBars, FaTimes, FaHome, FaLeaf,
  FaMicroscope, FaComments, FaStore, FaCloudSun, FaUsers, FaChevronDown, FaClipboardList,
} from 'react-icons/fa';
import LanguageSwitcher from './LanguageSwitcher';
import Logo from './Logo';
import { useLanguage } from '../context/LanguageContext';
import { getUser, clearSession, onAuthChange } from '../utils/auth';

// Single sticky app bar: brand, primary navigation, language and account.
const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef(null);
  const { currentLanguage, changeLanguage, translate } = useLanguage();

  useEffect(() => {
    setUser(getUser());
    return onAuthChange(setUser);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on navigation and on outside click.
  useEffect(() => { setMenuOpen(false); setShowUserMenu(false); }, [location.pathname]);
  useEffect(() => {
    const onDown = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  if (location.pathname === '/login' || location.pathname === '/signup') return null;

  const navItems = [
    { path: '/', label: translate('home', 'Home'), icon: FaHome, end: true },
    { path: '/my-farm', label: translate('myFarm', 'My Farm'), icon: FaClipboardList },
    { path: '/farm-analysis', label: translate('farmAnalysis', 'Farm Analysis'), icon: FaLeaf },
    { path: '/crop-analysis', label: translate('cropAnalysis', 'Crop Analysis'), icon: FaMicroscope },
    { path: '/chatbot', label: translate('chatbot', 'AI Assistant'), icon: FaComments },
    { path: '/weather', label: translate('weather', 'Weather'), icon: FaCloudSun },
    { path: '/marketplace', label: translate('marketplace', 'Marketplace'), icon: FaStore },
    { path: '/community', label: translate('community', 'Community'), icon: FaUsers },
  ];

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const initials = (user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header
      className={`sticky top-0 z-[1100] transition-all duration-300 ${
        scrolled ? 'bg-white/85 backdrop-blur-md shadow-soft' : 'bg-soil-50/70 backdrop-blur-sm'
      } border-b border-soil-200/70`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Krishi Sakhi home">
          <Logo className="h-10 w-10" />
          <div className="leading-tight">
            <p className="font-display text-xl font-semibold text-primary-900">Krishi Sakhi</p>
            <p className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-soil-700 sm:block">
              {translate('platformTagline', 'Smart Farm Analysis Platform')}
            </p>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav className="no-scrollbar mx-auto hidden min-w-0 items-center gap-1 overflow-x-auto xl:flex" aria-label="Main">
          {navItems.map(({ path, label, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-primary-800 text-white shadow-[0_6px_16px_-8px_rgba(22,59,40,0.9)]'
                    : 'text-soil-800 hover:bg-primary-50 hover:text-primary-800'
                }`
              }
            >
              <Icon className="text-[13px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-0">
          <div className="hidden sm:block">
            <LanguageSwitcher currentLanguage={currentLanguage} onLanguageChange={changeLanguage} />
          </div>

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-soil-200 bg-white py-1 pl-1 pr-3 transition hover:border-primary-300"
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-harvest-300 to-harvest-500 text-xs font-bold text-primary-950">
                  {initials}
                </span>
                <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-primary-900 md:block">{user.name}</span>
                <FaChevronDown className="text-[10px] text-soil-700" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-soil-200 bg-white py-1 shadow-lift fade-in" role="menu">
                  <div className="border-b border-soil-100 px-4 py-3">
                    <p className="text-xs text-soil-700">{translate('signedInAs', 'Signed in as')}</p>
                    <p className="truncate text-sm font-semibold text-primary-900">{user.email}</p>
                  </div>
                  <button onClick={() => navigate('/profile')} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-primary-50" role="menuitem">
                    <FaUser className="text-primary-700" /> {translate('myProfile', 'My Profile')}
                  </button>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-700 hover:bg-red-50" role="menuitem">
                    <FaSignOutAlt /> {translate('logout', 'Logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="btn-primary !px-4 !py-2 text-sm">
              <FaSignInAlt /> {translate('login', 'Login')}
            </button>
          )}

          <button
            onClick={() => setMenuOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full border border-soil-200 bg-white text-primary-800 xl:hidden"
            aria-label="Open menu"
          >
            <FaBars />
          </button>
        </div>
      </div>

      {/* Mobile / tablet drawer (portalled: the blurred header would otherwise
          become the containing block for this fixed element) */}
      {createPortal(
      <div className={`fixed inset-0 z-[1200] overflow-hidden xl:hidden ${menuOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'}`} aria-hidden={!menuOpen}>
        <div
          className={`absolute inset-0 bg-primary-950/50 backdrop-blur-sm transition-opacity ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMenuOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col bg-soil-50 shadow-2xl transition-transform duration-300 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-soil-200 p-4">
            <div className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="font-display text-lg font-semibold text-primary-900">{translate('menu', 'Menu')}</span>
            </div>
            <button onClick={() => setMenuOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-soil-100" aria-label="Close menu">
              <FaTimes />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main">
            {[...navItems, ...(user ? [{ path: '/profile', label: translate('profile', 'Profile'), icon: FaUser }] : [])].map(({ path, label, icon: Icon, end }) => (
              <NavLink
                key={path}
                to={path}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition ${
                    isActive ? 'bg-primary-800 text-white' : 'text-soil-800 hover:bg-white'
                  }`
                }
              >
                <Icon /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-soil-200 p-4 sm:hidden">
            <LanguageSwitcher currentLanguage={currentLanguage} onLanguageChange={changeLanguage} />
          </div>
        </aside>
      </div>,
      document.body
      )}
    </header>
  );
};

export default Header;
