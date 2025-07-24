import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import io from 'socket.io-client';
import { CheckCircle2, XCircle, Loader, Clock, Play, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import ErrorLogModal from './ErrorLogModal';

const apiBaseUrl = `http://${window.location.hostname}:3001`;
const socket = io(apiBaseUrl);

const TestDetail = ({ darkMode }) => {
  const { testId } = useParams();
  const [testCase, setTestCase] = useState(null);
  const [steps, setSteps] = useState([]);
  const [status, setStatus] = useState('Pending');
  const [progress, setProgress] = useState(0);

  // Error Modal 관련 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedError, setSelectedError] = useState(null);

  useEffect(() => {
    // onSnapshot 리스너가 DB 변경을 감지하여 testCase와 steps 상태를 자동으로 업데이트합니다.
    const unsub = onSnapshot(doc(db, "testCases", testId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTestCase(data);
        setSteps(data.steps || []);
        setStatus(data.status);
      }
    });

    // 웹소켓은 전체 테스트의 시작과 끝을 감지하여 UI 상태를 보조합니다.
    const handleTestStart = (data) => {
      if (data.testId === testId) {
        setStatus('In Progress');
      }
    };

    const handleTestFinish = (data) => {
      if (data.testId === testId) {
        setStatus(data.status);
      }
    };
    
    socket.on('test:start', handleTestStart);
    socket.on('test:finish', handleTestFinish);

    return () => {
      unsub();
      socket.off('test:start', handleTestStart);
      socket.off('test:finish', handleTestFinish);
    };
  }, [testId]);

  useEffect(() => {
    if (steps.length > 0) {
      const passedCount = steps.filter(s => s.status === 'passed' || s.status === 'Passed').length;
      setProgress(Math.round((passedCount / steps.length) * 100));
    } else {
        setProgress(status === 'Completed' ? 100 : 0);
    }
  }, [steps, status]);


  const handleRunTest = async () => {
    // 테스트 재시작 시, steps를 비우는 대신 서버가 DB를 초기화하고 onSnapshot이 업데이트하도록 둡니다.
    // setSteps([]);
    setProgress(0);
    setStatus('In Progress');
    try {
      await fetch(`${apiBaseUrl}/api/run-test/${testId}`, { method: 'POST' });
    } catch (error) {
      console.error("API 통신 오류:", error);
      setStatus('Failed');
    }
  };
  
  const getStatusInfo = (s) => {
    switch (s) {
      case 'Completed':
      case 'passed':
      case 'Passed':
        return { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, color: 'text-green-500' };
      case 'In Progress':
        return { icon: <Loader className="w-5 h-5 text-yellow-500 animate-spin" />, color: 'text-yellow-500' };
      case 'Pending':
        return { icon: <Clock className="w-5 h-5 text-gray-500" />, color: 'text-gray-500' };
      case 'failed':
      case 'Failed':
        return { icon: <XCircle className="w-5 h-5 text-red-500" />, color: 'text-red-500' };
      default:
        return { icon: <Clock className="w-5 h-5 text-gray-500" />, color: 'text-gray-500' };
    }
  };

  const handleFailClick = async (clickedStep, index) => {
    // 먼저 현재 클릭된 스텝 정보로 모달을 엽니다 (에러 메시지는 바로 볼 수 있도록)
    setSelectedError(clickedStep);
    setIsModalOpen(true);

    // Firestore에서 최신 데이터를 비동기적으로 가져와 모달 내용을 업데이트합니다.
    try {
      const testCaseRef = doc(db, "testCases", testId);
      const docSnap = await getDoc(testCaseRef);

      if (docSnap.exists()) {
        const latestStepData = (docSnap.data().steps || [])[index];
        if (latestStepData && latestStepData.screenshotURL) {
          // screenshotURL이 있는 최신 데이터로 모달 내용을 업데이트합니다.
          setSelectedError(latestStepData);
        }
      }
    } catch (error) {
      console.error("Error fetching latest step data for modal:", error);
    }
  };

  if (!testCase) {
    return <div className="flex-1 p-8 flex justify-center items-center"><Loader className="animate-spin" /></div>;
  }

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    const totalSeconds = milliseconds / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = Math.round(totalSeconds % 60);
    if (minutes > 0) {
      return `${minutes}분 ${remainingSeconds}초`;
    }
    return `${remainingSeconds}초`;
  };

  return (
    <>
      <div className="flex-1 p-6 md:p-8 bg-cool-gray-50 dark:bg-cool-gray-900 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/tests" className="flex items-center text-sm text-sky-600 dark:text-sky-400 hover:underline mb-4">
            <ArrowLeft size={16} className="mr-1" />
            Back to Test List
          </Link>
          <div className="bg-white dark:bg-cool-gray-800 p-6 rounded-xl shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              <div className="md:col-span-2">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">{testCase.testName}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{testCase.projectName} / {testCase.caseNumber}</p>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                    <div className="bg-sky-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{progress}%</span>
                </div>
              </div>
              <div className="flex items-center justify-end">
                {getStatusInfo(status).icon}
                <span className={`ml-2 text-sm font-medium ${getStatusInfo(status).color}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-cool-gray-800 p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Test Steps</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-cool-gray-50 dark:bg-cool-gray-700 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-6 py-3">Step</th>
                      <th scope="col" className="px-6 py-3">Description</th>
                      <th scope="col" className="px-6 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((step, index) => (
                      <tr key={index} className="bg-white border-b dark:bg-cool-gray-800 dark:border-cool-gray-700">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{index + 1}</td>
                        <td className="px-6 py-4">
                          {step.status === 'failed' || step.status === 'Failed' ? (
                            <button onClick={() => handleFailClick(step, index)} className="underline text-red-500 hover:text-red-700">
                              {step.name || ''}
                            </button>
                          ) : (
                            step.name || ''
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusInfo(step.status).color} bg-opacity-10`}>
                             {getStatusInfo(step.status).icon}
                            <span className="ml-1.5">{step.status.charAt(0).toUpperCase() + step.status.slice(1)}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white dark:bg-cool-gray-800 p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Test Summary</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between">
                  <span className="font-medium text-gray-500 dark:text-gray-400">생성일 :</span>
                  <span className="text-gray-800 dark:text-white">{testCase.createdAt?.toDate().toLocaleString() || 'N/A'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium text-gray-500 dark:text-gray-400">마지막 실행 :</span>
                  <span className="text-gray-800 dark:text-white">{testCase.lastRun?.toDate().toLocaleString() || 'N/A'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium text-gray-500 dark:text-gray-400">실행할 스크립트 :</span>
                  <span className="text-gray-800 dark:text-white">{testCase.scriptPath}</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium text-gray-500 dark:text-gray-400">생성한 사람 :</span>
                  <span className="text-gray-800 dark:text-white">{testCase.createdBy || 'N/A'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium text-gray-500 dark:text-gray-400">테스트 시간 :</span>
                  <span className="text-gray-800 dark:text-white">{formatDuration(testCase.duration)}</span>
                </li>
              </ul>
              <button onClick={handleRunTest} className="w-full mt-6 px-4 py-2 bg-sky-600 text-white rounded-lg shadow-sm hover:bg-sky-700 transition-colors disabled:bg-gray-400" disabled={status === 'In Progress'}>
                {status === 'In Progress' ? '실행중...' : '테스트 진행'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      <ErrorLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        errorData={selectedError}
      />
    </>
  );
};

export default TestDetail;