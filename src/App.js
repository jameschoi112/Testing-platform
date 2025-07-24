import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { mockChats } from './data';
import AdminHeader from './components/AdminHeader';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import UserDetails from './components/UserDetails';
import Dashboard from './components/Dashboard';
import TestList from './components/TestList';
import TestDetail from './components/TestDetail';
import TemplateManagement from './components/TemplateManagement';
import TestSchedule from './components/TestSchedule';
import Login from './components/Login';
import LoadingSpinner from './components/LoadingSpinner';

// Custom Hooks
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

const AppContent = ({ currentUser }) => {
  const [darkMode, setDarkMode] = useLocalStorage('darkMode', false);
  useLocalStorage('language', 'ko');
  const [selectedChat, setSelectedChat] = useState(mockChats[0]);
  const location = useLocation();

  const getActiveMenuFromPath = (path) => {
    if (path.startsWith('/tests')) return 'testList';
    if (path.startsWith('/templates')) return 'templates';
    if (path.startsWith('/schedule')) return 'schedule';
    if (path === '/chats') return 'chats';
    if (path === '/settings') return 'settings';
    return 'dashboard';
  };

  const [activeMenu, setActiveMenu] = useState(getActiveMenuFromPath(location.pathname));

  useEffect(() => {
    setActiveMenu(getActiveMenuFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className={`h-screen w-full flex flex-col font-sans transition-colors duration-200 ${darkMode ? 'dark' : ''}`}>
      <AdminHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <main className="flex flex-1 bg-white dark:bg-gray-800 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard darkMode={darkMode} />} />
            <Route path="/tests" element={<TestList darkMode={darkMode} />} />
            <Route path="/tests/:testId" element={<TestDetail darkMode={darkMode} />} />
            <Route path="/templates" element={<TemplateManagement darkMode={darkMode} />} />
            <Route path="/schedule" element={<TestSchedule darkMode={darkMode} />} />
            <Route path="/chats" element={
              <>
                <ChatList
                  chats={mockChats}
                  selectedChat={selectedChat}
                  setSelectedChat={setSelectedChat}
                />
                <ChatRoom chat={selectedChat} />
                <UserDetails user={selectedChat} />
              </>
            } />
            <Route path="/settings" element={<div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900"><h1 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h1></div>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (user) {
        // 사용자가 로그인하면 displayName을 localStorage에 저장
        localStorage.setItem('userName', user.displayName || user.email);
      } else {
        // 로그아웃하면 localStorage에서 userName 제거
        localStorage.removeItem('userName');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <AppContent currentUser={currentUser} />
    </Router>
  );
};

export default App;