import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FilePlus, ChevronDown, MoreVertical, FileText, Calendar, Hash } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';

const TemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [steps, setSteps] = useState([{ id: 1, name: '' }]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "testTemplates"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (querySnapshot) => {
      const templateList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate().toLocaleString('ko-KR') || 'N/A';
        return { id: doc.id, ...data, createdAt };
      });
      setTemplates(templateList);
    });
    return () => unsub();
  }, []);

  const handleAddStep = () => {
    setSteps([...steps, { id: Date.now(), name: '' }]);
  };

  const handleStepNameChange = (id, newName) => {
    setSteps(steps.map(step => step.id === id ? { ...step, name: newName } : step));
  };

  const handleRemoveStep = (id) => {
    setSteps(steps.filter(step => step.id !== id));
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || steps.some(step => !step.name.trim())) {
      alert('템플릿 이름과 모든 스텝의 내용을 입력해주세요.');
      return;
    }
    try {
      await addDoc(collection(db, 'testTemplates'), {
        name: newTemplateName,
        steps: steps.map(step => step.name),
        createdAt: serverTimestamp(),
      });
      setNewTemplateName('');
      setSteps([{ id: 1, name: '' }]);
      setIsFormVisible(false);
    } catch (error) {
      console.error("Error saving template: ", error);
      alert('템플릿 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (window.confirm("정말로 이 템플릿을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'testTemplates', id));
      } catch (error) {
        console.error("Error deleting template: ", error);
        alert('템플릿 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleToggleExpand = (templateId) => {
    setExpandedTemplateId(expandedTemplateId === templateId ? null : templateId);
  };

  return (
    <div className="flex-1 p-6 md:p-8 bg-cool-gray-50 dark:bg-cool-gray-900 overflow-y-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 to-sky-600 dark:from-white dark:to-sky-300 bg-clip-text text-transparent tracking-tight">
            템플릿 관리
          </h1>

        </div>
        <button
          onClick={() => setIsFormVisible(!isFormVisible)}
          className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-lg shadow-sm hover:bg-sky-700 transition-colors"
        >
          <FilePlus size={20} />
          <span>{isFormVisible ? '폼 닫기' : '새 템플릿 만들기'}</span>
        </button>
      </header>

      {isFormVisible && (
        <div className="bg-white dark:bg-cool-gray-800 p-6 rounded-xl shadow-md mb-8">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">새 템플릿 만들기</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="템플릿 이름 (예: 로그인 시나리오)"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full px-4 py-2 border border-cool-gray-200 dark:border-cool-gray-600 rounded-lg bg-cool-gray-50 dark:bg-cool-gray-700"
            />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 pt-2">테스트 스텝</h3>
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-2">
                <span className="text-gray-500">{index + 1}.</span>
                <input
                  type="text"
                  placeholder={`스텝 ${index + 1} 설명`}
                  value={step.name}
                  onChange={(e) => handleStepNameChange(step.id, e.target.value)}
                  className="flex-grow px-4 py-2 border border-cool-gray-200 dark:border-cool-gray-600 rounded-lg bg-cool-gray-50 dark:bg-cool-gray-700"
                />
                <button onClick={() => handleRemoveStep(step.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button onClick={handleAddStep} className="flex items-center space-x-2 text-sky-600 hover:text-sky-800">
              <Plus size={16} />
              <span>스텝 추가</span>
            </button>
          </div>
          <div className="flex justify-end space-x-4 mt-6">
            <button onClick={() => setIsFormVisible(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
              취소
            </button>
            <button onClick={handleSaveTemplate} className="px-4 py-2 bg-sky-600 text-white rounded-lg shadow-sm hover:bg-sky-700 transition-colors">
              템플릿 저장
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-cool-gray-800 p-6 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-cool-gray-50 dark:bg-cool-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3"><FileText className="inline-block mr-2" size={14} />템플릿 이름</th>
                <th scope="col" className="px-6 py-3"><Hash className="inline-block mr-2" size={14} />스텝 수</th>
                <th scope="col" className="px-6 py-3"><Calendar className="inline-block mr-2" size={14} />생성일</th>
                <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {templates.length > 0 ? templates.map(template => (
                <React.Fragment key={template.id}>
                  <tr className="bg-white border-b dark:bg-cool-gray-800 dark:border-cool-gray-700 hover:bg-cool-gray-50 dark:hover:bg-cool-gray-600">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      <button onClick={() => handleToggleExpand(template.id)} className="hover:underline cursor-pointer flex items-center">
                        {template.name}
                        <ChevronDown size={16} className={`ml-2 transition-transform duration-200 ${expandedTemplateId === template.id ? 'rotate-180' : ''}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4">{template.steps.length}</td>
                    <td className="px-6 py-4">{template.createdAt}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeleteTemplate(template.id)} className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                  {expandedTemplateId === template.id && (
                    <tr>
                      <td colSpan="4" className="p-4 bg-cool-gray-50 dark:bg-cool-gray-700/50">
                        <div className="p-4 rounded-lg bg-white dark:bg-cool-gray-800 shadow-inner">
                          <h4 className="font-bold mb-3 text-gray-800 dark:text-white">테스트 스텝</h4>
                          <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            {template.steps.map((step, index) => (
                              <li key={index} className="p-2 rounded-md bg-cool-gray-100 dark:bg-cool-gray-700">{step}</li>
                            ))}
                          </ol>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )) : (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500 dark:text-gray-400">
                    생성된 템플릿이 없습니다. '새 템플릿 만들기' 버튼을 클릭하여 추가해보세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TemplateManagement;