import React, { useState, useMemo, useEffect, useRef } from 'react';
import { EditIcon, SearchIcon, SortAscIcon, SortDescIcon, ExportIcon, ChevronDownIcon, CsvIcon, ExcelIcon, PdfIcon, TrashIcon } from './Icons';

const TransactionModal = ({ isOpen, onClose, title, transactions, type, categories, onUpdateCategory, onUpdateDescription, onDeleteTransaction }: any) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // State for animations and gestures
  const [updatedInfo, setUpdatedInfo] = useState<{ index: number, type: 'category' | 'description'} | null>(null);
  const [swipedIndex, setSwipedIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const listRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      // Close swiped item if clicking outside the list
      if (listRef.current && !listRef.current.contains(event.target as Node)) {
        setSwipedIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];
      setStartDate(toYYYYMMDD(firstDay));
      setEndDate(toYYYYMMDD(lastDay));
      
      setSearchTerm('');
      setSelectedCategory('All');
      setSortConfig({ key: 'date', direction: 'desc' });
      setSwipedIndex(null);
      setEditingIndex(null);
      setDeletingIndex(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEditing = (index: number, description: string) => {
    setSwipedIndex(null);
    setEditingIndex(index);
    setEditingDescription(description);
  };
  
  const triggerUpdateAnimation = (index: number, type: 'category' | 'description') => {
    setUpdatedInfo({ index, type });
    setTimeout(() => setUpdatedInfo(null), 1000); // Animation duration
  };

  const handleSaveDescription = (index: number) => {
    if (index === null || !onUpdateDescription) return;

    const originalTx = transactions[index];
    const trimmedDescription = editingDescription.trim();
    if (trimmedDescription && originalTx?.description !== trimmedDescription) {
      onUpdateDescription(index, trimmedDescription);
      triggerUpdateAnimation(index, 'description');
    }
    setEditingIndex(null);
  };
  
  const handleCategoryChange = (index: number, newCategory: string) => {
    if (transactions[index]?.category !== newCategory) {
        onUpdateCategory(index, newCategory);
        triggerUpdateAnimation(index, 'category');
    }
  };
  
  const handleDelete = (index: number) => {
    setDeletingIndex(index);
    setTimeout(() => {
        onDeleteTransaction(type, index);
        setDeletingIndex(null);
        setSwipedIndex(null);
    }, 500); // match animation duration
  };
  
  const amountColorClass = type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  const uniqueCategories = useMemo(() => {
    if (type !== 'debit' || !categories) return [];
    return categories.map(c => c.name).sort();
  }, [categories, type]);

  const processedTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (startDate) filtered = filtered.filter(tx => tx.date >= startDate);
    if (endDate) filtered = filtered.filter(tx => tx.date <= endDate);
    if (type === 'debit') {
      if (selectedCategory !== 'All') filtered = filtered.filter(tx => tx.category === selectedCategory);
      if (searchTerm) filtered = filtered.filter(tx => tx.description.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        else if (aVal < bVal) comparison = -1;
        return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
      });
    }

    return filtered;
  }, [transactions, selectedCategory, type, searchTerm, startDate, endDate, sortConfig]);

  const getFilename = (exportType: string, extension: string) => `${type}-${exportType}-${new Date().toISOString().split('T')[0]}.${extension}`;
  const handleExportViewCSV = () => { /* ... unchanged ... */ };
  const handleExportViewXLSX = () => { /* ... unchanged ... */ };
  const addPdfWatermark = (doc: any) => { /* ... unchanged ... */ };
  const handleExportViewPDF = () => { /* ... unchanged ... */ };
  const groupTransactionsByCategory = (txs: any[]) => txs.reduce((acc, tx) => {
      const category = tx.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tx);
      return acc;
  }, {} as { [key: string]: any[] });
  const handleExportCategoryCSV = () => { /* ... unchanged ... */ };
  const handleExportCategoryXLSX = () => { /* ... unchanged ... */ };
  const handleExportCategoryPDF = () => { /* ... unchanged ... */ };

  const handleSort = (key: string) => {
    setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <SortAscIcon className="w-4 h-4" /> : <SortDescIcon className="w-4 h-4" />;
  };

  const SortButton = ({ sortKey, children }: { sortKey: string, children: React.ReactNode }) => (
    <button onClick={() => handleSort(sortKey)} className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors text-sm ${sortConfig.key === sortKey ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
        <span>{children}</span>
        {getSortIcon(sortKey)}
    </button>
  );
  
  const ExportMenuItem = ({ onClick, icon, children }: { onClick: () => void, icon: React.ReactNode, children: React.ReactNode }) => (
    <button
      onClick={() => { onClick(); setIsExportMenuOpen(false); }}
      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-3 transition-colors"
      role="menuitem"
    >
      <span className="w-5 h-5 text-gray-500 dark:text-gray-400">{icon}</span>
      <span>{children}</span>
    </button>
  );
  
  // Swipe Handlers
  const swipeStartPos = useRef(0);
  const swipeDelta = useRef(0);
  // FIX: Changed ref type from HTMLLIElement to HTMLDivElement to match the element it's attached to.
  const swipedItemRef = useRef<HTMLDivElement | null>(null);

  // FIX: Updated event types from HTMLLIElement to HTMLDivElement to match the event source.
  const handleSwipeStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>, index: number) => {
    setSwipedIndex(index);
    swipeStartPos.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
    swipeDelta.current = 0;
    swipedItemRef.current = e.currentTarget;
    swipedItemRef.current.style.transition = 'none';
  };

  // FIX: Updated event types from HTMLLIElement to HTMLDivElement to match the event source.
  const handleSwipeMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (swipedIndex === null || !swipedItemRef.current) return;
    const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    swipeDelta.current = currentX - swipeStartPos.current;
    if (swipeDelta.current < 0) {
      swipedItemRef.current.style.transform = `translateX(${swipeDelta.current}px)`;
    }
  };

  const handleSwipeEnd = () => {
    if (swipedIndex === null || !swipedItemRef.current) return;
    swipedItemRef.current.style.transition = 'transform 0.3s ease';
    if (swipeDelta.current < -80) { // Threshold to reveal button
      swipedItemRef.current.style.transform = `translateX(-80px)`;
    } else {
      swipedItemRef.current.style.transform = `translateX(0px)`;
      setSwipedIndex(null);
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4 animate-fade-in-up" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white whitespace-nowrap">{title}</h2>
          <div className="flex items-center gap-4">
             {/* ... Export Menu ... */}
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
          </div>
        </header>
        
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
            {/* ... Filters and Sort Buttons ... */}
        </div>

        <div className="overflow-y-auto p-4 sm:p-6" ref={listRef}>
          <ul className="border-t border-gray-200 dark:border-gray-600">
            {processedTransactions.length > 0 ? (
              processedTransactions.map((tx, index) => {
                const originalIndex = transactions.findIndex((originalTx: any) => originalTx === tx);
                const isDebit = type === 'debit' && 'category' in tx;
                const isEditing = isDebit && editingIndex === originalIndex;
                
                const rowClass = index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50';
                const flashClass = updatedInfo?.index === originalIndex ? 'animate-flash' : '';
                const deleteClass = deletingIndex === originalIndex ? 'animate-slide-out' : '';

                return (
                  <li key={originalIndex} className={`relative overflow-hidden transition-all duration-500 ${deleteClass}`}>
                    <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
                       <button onClick={() => handleDelete(originalIndex)} className="text-white p-2 rounded-full hover:bg-red-600 transition-colors">
                            <TrashIcon className="w-6 h-6" />
                       </button>
                    </div>
                    <div
                      onTouchStart={(e) => handleSwipeStart(e, originalIndex)}
                      onTouchMove={handleSwipeMove}
                      onTouchEnd={handleSwipeEnd}
                      onMouseDown={(e) => handleSwipeStart(e, originalIndex)}
                      onMouseMove={handleSwipeMove}
                      onMouseUp={handleSwipeEnd}
                      onMouseLeave={handleSwipeEnd}
                      className={`${rowClass} ${flashClass} flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors group border-b border-gray-200 dark:border-gray-600 relative z-10 cursor-grab`}
                    >
                        <div className="flex-1 pr-4 w-full mb-2 sm:mb-0">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{tx.date}</div>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              onBlur={() => handleSaveDescription(originalIndex)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDescription(originalIndex); if (e.key === 'Escape') setEditingIndex(null); }}
                              className="bg-white dark:bg-gray-600 border border-blue-400 dark:border-blue-500 text-gray-900 dark:text-gray-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-1"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="flex items-center">
                              <span className="text-gray-700 dark:text-gray-300 text-sm flex-1">{tx.description}</span>
                              {isDebit && onUpdateDescription && (
                                <button onClick={(e) => { e.stopPropagation(); handleStartEditing(originalIndex, tx.description); }} className="ml-2 p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" aria-label={`Edit description for ${tx.description}`}>
                                  <EditIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 w-full sm:w-auto justify-end">
                          {isDebit && (
                            <div className="sm:w-48 w-full">
                              <select
                                value={tx.category}
                                onChange={(e) => handleCategoryChange(originalIndex, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="control-input p-2 w-full"
                                aria-label={`Category for ${tx.description}`}
                              >
                                {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                            </div>
                          )}
                          <span className={`font-semibold text-base sm:w-28 text-right flex-shrink-0 ${amountColorClass}`}>
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tx.amount)}
                          </span>
                        </div>
                    </div>
                  </li>
                )
              })
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No transactions match your current filters.</p>
            )}
          </ul>
        </div>
      </div>
       <style>{`.control-input { @apply bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2; }`}</style>
    </div>
  );
};

export default TransactionModal;