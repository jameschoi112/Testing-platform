import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Users, MessageSquare, Settings, Moon, Sun, UserPlus, ClipboardList, TestTube, Calendar, ClipboardEdit } from 'lucide-react';
import { translations } from '../data';
import Toggle from './Toggle';
import AddUserModal from './AddUserModal'; // We will create this component next
import { useState } from 'react';

const Sidebar = ({ activeMenu, setActiveMenu, darkMode, setDarkMode }) => {
  const t = translations.ko;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: BarChart3, path: '/' },
    { id: 'testList', label: '테스트 목록', icon: ClipboardEdit, path: '/tests' },
    { id: 'templates', label: '테스트 탬플릿 정의', icon: ClipboardList, path: '/templates' },
    { id: 'schedule', label: '테스트 일정', icon: Calendar, path: '/schedule' },
    { id: 'settings', label: t.settings, icon: Settings, path: '/settings' }
  ];

  return (
    <aside className="w-72 bg-sidebar-bg dark:bg-cool-gray-900 border-r border-gray-200/50 dark:border-gray-800 h-full transition-colors duration-300 flex flex-col">
      <div className="p-6">
        {/* Can add a logo here */}
      </div>
      <nav className="px-6 flex-1">
        <ul className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-lg'
                      : 'text-cool-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-cool-gray-700/50 hover:text-cool-gray-800 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-cool-gray-500'}`} />
                  <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-6 mt-auto border-t border-black/10 dark:border-gray-800 space-y-4">
        {/* Add User Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 bg-sky-600 text-white hover:bg-sky-700 shadow-lg transform hover:scale-105"
        >
          <UserPlus className="w-5 h-5" />
          <span className="font-semibold">계정 추가</span>
        </button>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {darkMode ? (
              <Moon className="w-5 h-5 text-cool-gray-600 dark:text-gray-400" />
            ) : (
              <Sun className="w-5 h-5 text-cool-gray-600 dark:text-gray-400" />
            )}
            <span className="text-sm font-medium text-cool-gray-700 dark:text-gray-300">
              {t.darkMode}
            </span>
          </div>
          <Toggle enabled={darkMode} onChange={setDarkMode} />
        </div>
      </div>

      <AddUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </aside>
  );
};

export default Sidebar;