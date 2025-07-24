import React, { useState, useEffect } from 'react';
import { translations } from '../data';
import Chart from 'react-apexcharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import moment from 'moment';
import 'moment/locale/ko';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Users, MessageSquare, ArrowUpRight, UserPlus, Activity, TrendingUp, Eye, Clock, Target, Car, Calendar as CalendarIcon, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

moment.updateLocale('ko', {
  week: {
    dow: 0, // Sunday is the first day of the week
  },
});

// 달력 스타일 오버라이드
const calendarStyles = `
  .mini-calendar-container .react-calendar__tile {
    border-radius: 6px !important;
  }
  .mini-calendar-container .react-calendar__tile--now {
    border-radius: 6px !important;
  }
  .mini-calendar-container .react-calendar__tile--active {
    border-radius: 6px !important;
  }
`;

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  })
};

const GlassCard = ({ children, className = "", delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <motion.div
      className={`
        backdrop-blur-xl bg-white/10 dark:bg-slate-800/20
        border border-white/20 dark:border-slate-700/50
        rounded-2xl shadow-lg
        transform transition-all duration-700 ease-out
        hover:scale-[1.02] hover:shadow-3xl hover:bg-white/15 dark:hover:bg-slate-800/30
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
};

const AnimatedNumber = ({ value, duration = 2000 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easedProgress * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }, [value, duration]);

  return <span>{displayValue}</span>;
};

const StatCard = ({ icon, title, value, change, changeType, index, gradient, accentColor }) => {
  return (
    <GlassCard delay={index * 150}>
      <div className="relative overflow-hidden group">
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accentColor}15, transparent 70%)`
          }}
        />

        <div className="relative p-8">
          <div className="flex items-center justify-between mb-6">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
              {React.cloneElement(icon, {
                size: 24,
                className: "text-white drop-shadow-lg"
              })}
            </div>
            {change && (
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-bold ${
                changeType === 'increase'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                <ArrowUpRight size={14} className={changeType === 'increase' ? '' : 'transform rotate-180'} />
                <span>{change}</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mb-2">{title}</p>
            <p className="text-3xl font-bold text-slate-700 dark:text-white mb-1">
              <AnimatedNumber value={value} />
            </p>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sky-400/50 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </div>
      </div>
    </GlassCard>
  );
};

const PulseIndicator = ({ color = "bg-sky-500", size = "w-3 h-3" }) => (
  <div className="relative">
    <div className={`${size} ${color} rounded-full`} />
    <div className={`absolute inset-0 ${size} ${color} rounded-full animate-ping opacity-75`} />
  </div>
);

const Dashboard = ({ darkMode }) => {
  const t = translations.ko;
  const [scheduleEvents, setScheduleEvents] = useState([]);

  useEffect(() => {
    // Firebase에서 스케줄 데이터 실시간으로 가져오기
    const unsubscribe = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          details: data.details,
          color: data.color,
          start: data.start.toDate(),
          end: data.end.toDate(),
        };
      });
      setScheduleEvents(fetchedEvents);
    });
    return unsubscribe;
  }, []);

  const getTodayScheduledTests = () => {
    const today = new Date();
    return scheduleEvents.filter(event =>
      moment(event.start).isSame(today, 'day')
    ).sort((a, b) => moment(a.start).diff(moment(b.start)));
  };

  const tileClassName = ({ date, view }) => {
    const classes = [];
    if (view === 'month') {
      // Dim out other month's days
      if (moment(date).month() !== new Date().getMonth()) {
        classes.push('dimmed');
      }

      // Add classes for weekends
      const day = moment(date).day();
      if (day === 0) { // Sunday
        classes.push('sunday');
      } else if (day === 6) { // Saturday
        classes.push('saturday');
      }

      // Highlight days with events
      const hasEvent = scheduleEvents.some(event =>
        moment(date).isBetween(moment(event.start).startOf('day'), moment(event.end).endOf('day'), 'day', '[]')
      );
      if (hasEvent) {
        classes.push('highlight');
      }
    }
    return classes.join(' ');
  };

  const totalUsers = 125; // Mock data
  const activeUsers = 88; // Mock data
  const totalChats = 1234; // Mock data

  const apexAreaChartOptions = {
     chart: {
       toolbar: { show: false },
      zoom: { enabled: false },
      foreColor: darkMode ? '#e2e8f0' : '#475569',
      fontFamily: 'Poppins, sans-serif',
      background: 'transparent',
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 4,
      colors: ['#0ea5e9']
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.8,
        gradientToColors: ['#0284c7'],
        inverseColors: false,
        opacityFrom: 0.8,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
    grid: {
      borderColor: darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
      strokeDashArray: 4,
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: darkMode ? '#94a3b8' : '#64748b'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => Math.floor(val),
        style: {
          colors: darkMode ? '#94a3b8' : '#64748b'
        }
      }
    },
    tooltip: {
      theme: darkMode ? 'dark' : 'light',
      x: { show: false },
      style: {
        fontSize: '12px',
        fontFamily: 'Poppins, sans-serif',
      }
    },
    legend: { show: false },
    colors: ['#0ea5e9'],
  };

  const apexAreaChartSeries = [{
    name: t.totalChats,
    data: [31, 40, 28, 51, 42, 109, 100]
  }];

  return (
    <div className="flex-1 p-6 md:p-8 bg-gradient-to-br from-slate-50 via-sky-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-y-auto relative z-10">
      {/* 달력 스타일 주입 */}
      <style>{calendarStyles}</style>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
      </div>

      <motion.header
        className="flex justify-between items-center mb-8 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 to-sky-600 dark:from-white dark:to-sky-300 bg-clip-text text-transparent tracking-tight">
            {t.dashboard}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
        </div>
      </motion.header>

      <main className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
        {/* Main content */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon={<Users />}
              title={t.totalUsers}
              value={totalUsers}
              change="+5.2%"
              changeType="increase"
              index={0}
              gradient="from-sky-500 to-blue-600"
              accentColor="#0ea5e9"
            />
            <StatCard
              icon={<MessageSquare />}
              title={t.totalChats}
              value={totalChats}
              change="+12%"
              changeType="increase"
              index={1}
              gradient="from-blue-500 to-indigo-600"
              accentColor="#3b82f6"
            />
            <StatCard
              icon={<Activity />}
              title={t.activeUsers}
              value={activeUsers}
              change="+8.1%"
              changeType="increase"
              index={2}
              gradient="from-cyan-500 to-sky-600"
              accentColor="#06b6d4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard delay={600}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-700 dark:text-white flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-sky-500" />
                    <span>{t.chatsPerDay}</span>
                  </h2>
                  <div className="flex items-center space-x-2">
                    <PulseIndicator color="bg-sky-500" size="w-2 h-2" />
                    <span className="text-sky-500 text-xs font-medium">실시간</span>
                  </div>
                </div>
                <Chart options={apexAreaChartOptions} series={apexAreaChartSeries} type="area" height={250} />
              </div>
            </GlassCard>
            <GlassCard delay={750}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-700 dark:text-white flex items-center space-x-2">
                    <CalendarIcon className="w-5 h-5 text-sky-500" />
                    <span>테스트 일정</span>
                  </h2>
                </div>
                <div className="mini-calendar-container">
                  <Calendar
                    locale="ko-KR"
                    tileClassName={tileClassName}
                    formatShortWeekday={(locale, date) => moment(date).format('ddd')}
                    navigationLabel={({ date }) => `${date.getFullYear()}년 ${date.getMonth() + 1}월`}
                    prev2Label={null}
                    next2Label={null}
                    showNeighboringMonth={true}
                  />
                </div>
              </div>
            </GlassCard>
          </div>

        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <GlassCard delay={1000}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-4 flex items-center space-x-2">
                <Target className="w-5 h-5 text-sky-500" />
                <span>{t.performanceMetrics}</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{t.responseTime}</span>
                  <span className="text-sky-500 font-bold">7분 30초</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{t.satisfaction}</span>
                  <span className="text-blue-500 font-bold">96%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{t.serviceUptime}</span>
                  <span className="text-cyan-500 font-bold">99.9%</span>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard delay={1200} className="flex-grow flex flex-col">
            <div className="p-6 flex-grow flex flex-col">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-4 flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-sky-500" />
                <span>오늘 예정된 일정</span>
              </h3>
              <div className="flex-grow flex flex-col">
                {getTodayScheduledTests().length > 0 ? (
                  <div className="space-y-3">
                    {getTodayScheduledTests().map((event, index) => (
                      <div key={event.id} className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex-shrink-0">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: event.color }}
                          ></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-white truncate">
                            {event.title}
                          </p>
                          {event.details && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {event.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        오늘 예정된 일정이 없습니다
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;