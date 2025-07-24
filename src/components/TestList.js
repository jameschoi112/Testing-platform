import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { translations } from '../data';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreVertical, PlusCircle, Search, CheckCircle2, XCircle, Loader, HelpCircle, Play, Pause, Trash2, Clock } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import AddTestModal from './AddTestModal';
import Tooltip from './Tooltip';

const TestList = ({ darkMode }) => {
  const t = translations.ko;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tests, setTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState({ id: null, direction: 'down' });
  const dropdownRef = useRef(null);
  const testsPerPage = 8;

  const filteredTests = tests.filter(test =>
    test.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastTest = currentPage * testsPerPage;
  const indexOfFirstTest = indexOfLastTest - testsPerPage;
  const currentTests = filteredTests.slice(indexOfFirstTest, indexOfLastTest);
  const totalPages = Math.ceil(filteredTests.length / testsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRunIndividualTest = async (testId) => {
    setMessage(`테스트(${testId.substring(0,6)}) 실행 요청...`);
    try {
      const response = await fetch(`http://localhost:3001/api/run-test/${testId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (response.status === 202) {
        setMessage(data.message);
      } else {
        setMessage(`오류: ${data.message}`);
      }
    } catch (error) {
      setMessage(`API 통신 오류: ${error.message}`);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (window.confirm("정말로 이 테스트를 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "testCases", testId));
        setMessage("테스트가 삭제되었습니다.");
      } catch (error) {
        console.error("Error deleting test: ", error);
        setMessage("테스트 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "testCases"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const testList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate().toLocaleString() || 'N/A';
        return { id: doc.id, ...data, createdAt };
      });
      setTests(testList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to test cases: ", error);
      setMessage("실시간 데이터 로딩 중 오류 발생");
      setIsLoading(false);
    });

    // Clean up a listener
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown({ id: null, direction: 'down' });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDropdownToggle = (event, testId) => {
    if (openDropdown.id === testId) {
      setOpenDropdown({ id: null, direction: 'down' });
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const dropdownHeight = 120; // Approximate height of the dropdown

    const direction = spaceBelow < dropdownHeight ? 'up' : 'down';
    setOpenDropdown({ id: testId, direction });
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'Completed':
        return { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, color: 'text-green-500' };
      case 'In Progress':
        return { icon: <Loader className="w-4 h-4 text-yellow-500 animate-spin" />, color: 'text-yellow-500' };
      case 'Pending':
        return { icon: <Clock className="w-4 h-4 text-gray-500" />, color: 'text-gray-500' };
      case 'Failed':
        return { icon: <XCircle className="w-4 h-4 text-red-500" />, color: 'text-red-500' };
      default:
        return { icon: <HelpCircle className="w-4 h-4 text-gray-500" />, color: 'text-gray-500' };
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 bg-cool-gray-50 dark:bg-cool-gray-900 overflow-y-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 to-sky-600 dark:from-white dark:to-sky-300 bg-clip-text text-transparent tracking-tight">
            {t.userManagement}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{t.userManagementDesc}</p>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-lg shadow-sm hover:bg-sky-700 transition-colors">
            <PlusCircle size={20} />
            <span>Add Test</span>
          </button>
        </div>
      </header>

      <AddTestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTestAdded={() => { /* onSnapshot이 자동으로 처리하므로 별도 호출 불필요 */ }}
      />

      <div className="bg-white dark:bg-cool-gray-800 p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-cool-gray-200 dark:border-cool-gray-600 rounded-lg bg-cool-gray-50 dark:bg-cool-gray-700 text-gray-800 dark:text-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-grow" />
          <Tooltip content="추가된 테스트의 더보기 버튼을 클릭해서 테스트를 실행 및 중지가 가능합니다.">
            <HelpCircle className="w-5 h-5 text-gray-400 cursor-pointer" />
          </Tooltip>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-cool-gray-50 dark:bg-cool-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="p-4">
                  <div className="flex items-center">
                    <input id="checkbox-all" type="checkbox" className="w-4 h-4 text-sky-600 bg-gray-100 border-gray-300 rounded focus:ring-sky-500 dark:focus:ring-sky-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                    <label htmlFor="checkbox-all" className="sr-only">checkbox</label>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3">Case No.</th>
                <th scope="col" className="px-6 py-3">Project Name</th>
                <th scope="col" className="px-6 py-3">Test Name</th>
                <th scope="col" className="px-6 py-3">Progress</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Created At</th>
                <th scope="col" className="px-6 py-3">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-500 dark:text-gray-400">
                    <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : filteredTests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-500 dark:text-gray-400">
                    검색된 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                currentTests.map(test => (
                  <tr key={test.id} className="bg-white border-b dark:bg-cool-gray-800 dark:border-cool-gray-700 hover:bg-cool-gray-50 dark:hover:bg-cool-gray-600 cursor-pointer">
                    <td className="w-4 p-4">
                      <div className="flex items-center">
                        <input id={`checkbox-table-${test.id}`} type="checkbox" className="w-4 h-4 text-sky-600 bg-gray-100 border-gray-300 rounded focus:ring-sky-500 dark:focus:ring-sky-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                        <label htmlFor={`checkbox-table-${test.id}`} className="sr-only">checkbox</label>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Link to={`/tests/${test.id}`} className="hover:underline">{test.caseNumber}</Link></td>
                    <td className="px-6 py-4"><Link to={`/tests/${test.id}`} className="hover:underline">{test.projectName}</Link></td>
                    <td className="px-6 py-4"><Link to={`/tests/${test.id}`} className="hover:underline">{test.testName}</Link></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                          <div className="bg-sky-600 h-2.5 rounded-full" style={{ width: test.status === 'Completed' ? '100%' : (test.status === 'In Progress' ? '50%' : '0%') }}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{test.status === 'Completed' ? '100%' : (test.status === 'In Progress' ? '50%' : '0%')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStatusInfo(test.status).icon}
                        <span className={`ml-2 text-sm font-medium ${getStatusInfo(test.status).color}`}>
                          {test.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{test.createdAt}</td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={(e) => handleDropdownToggle(e, test.id)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                      >
                        <MoreVertical size={20} />
                      </button>
                      <AnimatePresence>
                        {openDropdown.id === test.id && (
                          <div
                            ref={dropdownRef}
                            className={`absolute right-0 w-48 bg-white dark:bg-cool-gray-700 rounded-md shadow-lg z-20 ${
                              openDropdown.direction === 'down' ? 'mt-2' : 'mb-2 bottom-full'
                            }`}
                          >
                            <ul className="py-1 text-gray-700 dark:text-gray-200">
                              <li>
                                <button onClick={() => handleRunIndividualTest(test.id)} className="w-full text-left flex items-center px-4 py-2 hover:bg-cool-gray-100 dark:hover:bg-cool-gray-600">
                                  <Play size={16} className="mr-2" />
                                  테스트 실행
                                </button>
                              </li>
                              <li>
                                <a href="#" className="flex items-center px-4 py-2 hover:bg-cool-gray-100 dark:hover:bg-cool-gray-600">
                                  <Pause size={16} className="mr-2" />
                                  중지
                                </a>
                              </li>
                              <li>
                                <button onClick={() => handleDeleteTest(test.id)} className="w-full text-left flex items-center px-4 py-2 text-red-600 hover:bg-cool-gray-100 dark:hover:bg-cool-gray-600">
                                  <Trash2 size={16} className="mr-2" />
                                  삭제
                                </button>
                              </li>
                            </ul>
                          </div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <nav className="flex items-center justify-between pt-4" aria-label="Table navigation">
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Showing <span className="font-semibold text-gray-900 dark:text-white">{indexOfFirstTest + 1}-{indexOfLastTest > filteredTests.length ? filteredTests.length : indexOfLastTest}</span> of <span className="font-semibold text-gray-900 dark:text-white">{filteredTests.length}</span></span>
          <ul className="inline-flex items-center -space-x-px">
            <li>
              <button onClick={() => paginate(1)} disabled={currentPage === 1} className="px-3 h-8 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-cool-gray-800 dark:border-cool-gray-700 dark:text-gray-400 dark:hover:bg-cool-gray-700 dark:hover:text-white disabled:opacity-50">
                <ChevronsLeft size={16} />
              </button>
            </li>
            <li>
              <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-cool-gray-800 dark:border-cool-gray-700 dark:text-gray-400 dark:hover:bg-cool-gray-700 dark:hover:text-white disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
            </li>
            <li>
              <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-cool-gray-800 dark:border-cool-gray-700 dark:text-gray-400 dark:hover:bg-cool-gray-700 dark:hover:text-white disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </li>
            <li>
              <button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages} className="px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-cool-gray-800 dark:border-cool-gray-700 dark:text-gray-400 dark:hover:bg-cool-gray-700 dark:hover:text-white disabled:opacity-50">
                <ChevronsRight size={16} />
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default TestList;