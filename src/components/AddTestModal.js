import React, { useState } from 'react';
import { X, Type, TestTube, Briefcase, Search, Check, Link2, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, doc, runTransaction, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';

const AddTestModal = ({ isOpen, onClose, onTestAdded }) => {
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState({
    templateId: '', // 'custom' 또는 템플릿 ID
    testMethod: '자동',
    testName: '',
    projectName: '',
    testUrl: '',
    selectedScopes: [],
    scriptPath: '',
  });
  const [scriptFiles, setScriptFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 템플릿 목록 가져오기
      const q = query(collection(db, "testTemplates"), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(q, (querySnapshot) => {
        const templatesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTemplates(templatesData);
        if (templatesData.length > 0) {
          setFormData(prev => ({ ...prev, templateId: templatesData[0].id }));
        } else {
          setFormData(prev => ({ ...prev, templateId: 'custom' }));
        }
      });

      // 스크립트 파일 목록 가져오기
      const fetchScripts = async () => {
        try {
          const apiBaseUrl = `http://${window.location.hostname}:3001`;
          const response = await fetch(`${apiBaseUrl}/api/scripts`);
          const files = await response.json();
          setScriptFiles(files);
          if (files.length > 0) {
            setFormData(prev => ({ ...prev, scriptPath: files[0] }));
          }
        } catch (error) {
          console.error("Failed to fetch scripts:", error);
        }
      };
      fetchScripts();
      
      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allScopes = ['로그인', '대시보드', '인사 기능 확인', '채팅', '설정', '사용자 관리', '알림', '결제 시스템', '리포트', 'API 연동'];

  const filteredScopes = allScopes.filter(scope => scope.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const toggleScope = (scope) => {
    setFormData(prev => ({
      ...prev,
      selectedScopes: prev.selectedScopes.includes(scope)
        ? prev.selectedScopes.filter(s => s !== scope)
        : [...prev.selectedScopes, scope]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.testName || !formData.testUrl || !formData.scriptPath) {
      alert('테스트 이름, URL, 실행 스크립트는 필수 선택 사항입니다.');
      return;
    }
    setIsLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', 'testCases');
        const counterDoc = await transaction.get(counterRef);

        if (!counterDoc.exists()) {
          throw "Counter document does not exist!";
        }

        const newCount = counterDoc.data().count + 1;
        const caseNumber = `DOD-${String(newCount).padStart(3, '0')}`;

        transaction.update(counterRef, { count: newCount });

        const newTestRef = doc(collection(db, 'testCases'));
        let steps = [];
        let templateSteps = [];
        if (formData.templateId !== 'custom') {
            const selectedTemplate = templates.find(t => t.id === formData.templateId);
            if (selectedTemplate && selectedTemplate.steps) {
              templateSteps = selectedTemplate.steps;
              steps = templateSteps.map(stepName => ({ name: stepName, status: 'Pending' }));
            }
        }

        const userName = localStorage.getItem('userName') || 'Unknown';
        transaction.set(newTestRef, {
          ...formData,
          caseNumber: caseNumber,
          status: 'Pending',
          createdAt: serverTimestamp(),
          createdBy: userName,
          steps: steps,
          templateSteps: templateSteps, // 원본 스텝 이름 저장
        });
      });

      onTestAdded();
      onClose();

    } catch (error) {
      console.error("Transaction failed: ", error);
      alert('테스트 추가 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const t = {
    addTest: '새 테스트 추가',
    testType: '테스트 종류',
    testMethod: '테스트 방법',
    testName: '테스트 이름',
    projectName: '프로젝트 이름',
    cancel: '취소',
    add: '추가',
    placeholderTestName: '예. v3.5 리그레션 테스트',
    placeholderProjectName: '예. 그리팅 프로젝트',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-cool-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          >
            <div className="p-6 bg-sky-600 text-white flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t.addTest}</h2>
              <motion.button onClick={onClose} whileHover={{ scale: 1.1, rotate: 90 }} className="p-1 rounded-full hover:bg-sky-500 transition-colors">
                <X size={24} />
              </motion.button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    <TestTube className="w-4 h-4 mr-2 text-sky-500"/>
                    {t.testType}
                  </label>
                  <select id="templateId" value={formData.templateId} onChange={handleInputChange} className="w-full px-4 py-3 border border-cool-gray-200 dark:border-cool-gray-600 rounded-lg bg-cool-gray-50 dark:bg-cool-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-300 shadow-sm">
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                    <option value="custom">Custom Test</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    <Type className="w-4 h-4 mr-2 text-sky-500"/>
                    {t.testMethod}
                  </label>
                  <select id="testMethod" value={formData.testMethod} onChange={handleInputChange} className="w-full px-4 py-3 border border-cool-gray-200 dark:border-cool-gray-600 rounded-lg bg-cool-gray-50 dark:bg-cool-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-300 shadow-sm">
                    <option>자동</option>
                    <option>수동</option>
                  </select>
                </div>
              </div>
              <div className="mb-6">
                <label htmlFor="testName" className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Type className="w-4 h-4 mr-2 text-sky-500"/>
                  {t.testName}
                </label>
                <input type="text" id="testName" value={formData.testName} onChange={handleInputChange} placeholder={t.placeholderTestName} className="w-full px-4 py-3 border border-cool-gray-200 dark:border-cool-gray-600 rounded-lg bg-cool-gray-50 dark:bg-cool-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-300 shadow-sm" />
              </div>
              <div className="mb-6">
                <label htmlFor="projectName" className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Briefcase className="w-4 h-4 mr-2 text-sky-500"/>
                  {t.projectName}
                </label>
                <input type="text" id="projectName" value={formData.projectName} onChange={handleInputChange} placeholder={t.placeholderProjectName} className="w-full px-4 py-3 border border-cool-gray-200 dark:border-cool-gray-600 rounded-lg bg-cool-gray-50 dark:bg-cool-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-300 shadow-sm" />
              </div>
              <div className="mb-6">
                <label htmlFor="testUrl" className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Link2 className="w-4 h-4 mr-2 text-sky-500"/>
                  테스트 대상 URL
                </label>
                <input type="url" id="testUrl" value={formData.testUrl} onChange={handleInputChange} placeholder="https://example.com" className="w-full px-4 py-3 border border-cool-gray-200 dark:border-cool-gray-600 rounded-lg bg-cool-gray-50 dark:bg-cool-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-300 shadow-sm" />
              </div>
              <div className="mb-8">
                <label htmlFor="scriptPath" className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <TestTube className="w-4 h-4 mr-2 text-sky-500"/>
                  실행 스크립트
                </label>
                <select id="scriptPath" value={formData.scriptPath} onChange={handleInputChange} className="w-full px-4 py-3 border border-cool-gray-200 dark:border-cool-gray-600 rounded-lg bg-cool-gray-50 dark:bg-cool-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-300 shadow-sm">
                  {scriptFiles.map(file => (
                    <option key={file} value={file}>{file}</option>
                  ))}
                </select>
              </div>
              {formData.templateId === 'custom' && (
                <div className="mb-8">
                  <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    <Briefcase className="w-4 h-4 mr-2 text-sky-500"/>
                    테스트 범위
                  </label>
                  <div className="p-4 border border-cool-gray-200 dark:border-cool-gray-600 rounded-lg bg-cool-gray-50 dark:bg-cool-gray-900/50">
                    <div className="relative mb-4">
                      <input
                        type="text"
                        placeholder="범위 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-cool-gray-300 dark:border-cool-gray-500 rounded-lg bg-white dark:bg-cool-gray-700 text-gray-800 dark:text-white"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2">
                      {filteredScopes.map(scope => (
                        <motion.button
                          type="button"
                          key={scope}
                          onClick={() => toggleScope(scope)}
                          className={`w-full text-sm px-3 py-2 rounded-md flex items-center justify-center transition-all duration-200 ${
                            formData.selectedScopes.includes(scope)
                              ? 'bg-sky-600 text-white shadow-md'
                              : 'bg-white dark:bg-cool-gray-700 text-gray-700 dark:text-gray-300 hover:bg-cool-gray-100 dark:hover:bg-cool-gray-600'
                          }`}
                          whileTap={{ scale: 0.95 }}
                        >
                          {formData.selectedScopes.includes(scope) && <Check size={16} className="mr-2" />}
                          {scope}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <motion.button type="button" onClick={onClose} className="px-8 py-3 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-cool-gray-700 hover:bg-gray-200 dark:hover:bg-cool-gray-600 font-bold transition-colors text-sm" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  {t.cancel}
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 rounded-lg text-white bg-sky-600 hover:bg-sky-700 font-bold shadow-lg shadow-sky-600/30 hover:shadow-xl hover:shadow-sky-600/40 transition-all duration-300 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  whileHover={{ scale: isLoading ? 1 : 1.05, y: isLoading ? 0 : -2 }}
                  whileTap={{ scale: isLoading ? 1 : 0.95, y: 0 }}
                >
                  {isLoading ? <Loader className="animate-spin" /> : t.add}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddTestModal;