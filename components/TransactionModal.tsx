import React, { useState, useMemo } from 'react';
import { Transaction, DebitTransaction, ModalType } from '../types';
// FIX: Removed unused 'CalendarIcon' import as it is not exported from './Icons'.
import { EditIcon, SearchIcon, SortAscIcon, SortDescIcon } from './Icons';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: (Transaction | DebitTransaction)[];
  type: ModalType;
  categories?: string[];
  onUpdateCategory?: (transactionIndex: number, newCategory: string) => void;
  onUpdateDescription?: (transactionIndex: number, newDescription: string) => void;
}

type SortKey = 'date' | 'description' | 'amount';

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, title, transactions, type, categories, onUpdateCategory, onUpdateDescription }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });


  if (!isOpen) return null;

  const handleStartEditing = (index: number, description: string) => {
    setEditingIndex(index);
    setEditingDescription(description);
  };

  const handleSaveDescription = () => {
    if (editingIndex === null || !onUpdateDescription) return;

    const originalTx = transactions[editingIndex];
    const trimmedDescription = editingDescription.trim();
    if (trimmedDescription && originalTx?.description !== trimmedDescription) {
      onUpdateDescription(editingIndex, trimmedDescription);
    }
    setEditingIndex(null);
  };
  
  const amountColorClass = type === ModalType.CREDIT ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  const uniqueCategories = useMemo(() => {
    if (type !== ModalType.DEBIT || !categories) return [];
    const all = new Set(categories);
    transactions.forEach(tx => {
      if ('category' in tx) {
        all.add((tx as DebitTransaction).category);
      }
    });
    return Array.from(all).sort();
  }, [categories, transactions, type]);

  const processedTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (startDate) {
      filtered = filtered.filter(tx => tx.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(tx => tx.date <= endDate);
    }

    if (type === ModalType.DEBIT) {
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(tx => 'category' in tx && (tx as DebitTransaction).category === selectedCategory);
      }
      if (searchTerm) {
        filtered = filtered.filter(tx => tx.description.toLowerCase().includes(searchTerm.toLowerCase()));
      }
    }
    
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        let comparison = 0;
        if (aVal > bVal) {
          comparison = 1;
        } else if (aVal < bVal) {
          comparison = -1;
        }
        return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
      });
    }

    return filtered;
  }, [transactions, selectedCategory, type, searchTerm, startDate, endDate, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => {
        if (current.key === key && current.direction === 'asc') {
            return { key, direction: 'desc' };
        }
        return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <SortAscIcon className="w-4 h-4" /> : <SortDescIcon className="w-4 h-4" />;
  };

  const SortButton: React.FC<{ sortKey: SortKey, children: React.ReactNode }> = ({ sortKey, children }) => (
    <button onClick={() => handleSort(sortKey)} className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors text-sm ${sortConfig.key === sortKey ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
        <span>{children}</span>
        {getSortIcon(sortKey)}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4 animate-fade-in-up" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white whitespace-nowrap">{title}</h2>
          <div className="flex-grow flex justify-end">
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
          </div>
        </header>
        
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Date Filters */}
                <div className="flex flex-col">
                    <label htmlFor="startDate" className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="control-input"/>
                </div>
                 <div className="flex flex-col">
                    <label htmlFor="endDate" className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="control-input"/>
                </div>

                {/* Debit-only Filters */}
                {type === ModalType.DEBIT && (
                    <>
                     <div className="flex flex-col">
                        <label htmlFor="categoryFilter" className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                        <select id="categoryFilter" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="control-input" aria-label="Filter by category">
                            <option value="All">All Categories</option>
                            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                     </div>
                     <div className="flex flex-col relative">
                        <label htmlFor="search" className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search Description</label>
                        <SearchIcon className="absolute bottom-2.5 left-2.5 w-4 h-4 text-gray-400" />
                        <input id="search" type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="control-input pl-8"/>
                     </div>
                    </>
                )}
            </div>
             <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Sort by:</span>
                <SortButton sortKey="date">Date</SortButton>
                <SortButton sortKey="description">Description</SortButton>
                <SortButton sortKey="amount">Amount</SortButton>
             </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <ul className="space-y-3">
            {processedTransactions.length > 0 ? (
              processedTransactions.map((tx) => {
                const originalIndex = transactions.findIndex(originalTx => originalTx === tx);
                const isDebit = type === ModalType.DEBIT && 'category' in tx;
                const debitTx = isDebit ? (tx as DebitTransaction) : null;
                const isEditing = isDebit && editingIndex === originalIndex;

                return (
                  <li key={originalIndex} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition group">
                    <div className="flex-1 pr-4 w-full mb-2 sm:mb-0">
                       <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{tx.date}</div>
                       {isEditing ? (
                        <input
                          type="text"
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          onBlur={handleSaveDescription}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveDescription();
                            if (e.key === 'Escape') setEditingIndex(null);
                          }}
                          className="bg-white dark:bg-gray-600 border border-blue-400 dark:border-blue-500 text-gray-900 dark:text-gray-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-1"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                       ) : (
                        <div className="flex items-center">
                          <span className="text-gray-700 dark:text-gray-300 text-sm flex-1">{tx.description}</span>
                          {isDebit && onUpdateDescription && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditing(originalIndex, tx.description);
                              }}
                              className="ml-2 p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                              aria-label={`Edit description for ${tx.description}`}
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                       )}
                    </div>
                    <div className="flex items-center space-x-4 w-full sm:w-auto justify-end">
                      {isDebit && categories && onUpdateCategory && debitTx && (
                        <div className="sm:w-48 w-full">
                          <select
                            value={debitTx.category}
                            onChange={(e) => onUpdateCategory(originalIndex, e.target.value)}
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
                  </li>
                )
              })
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No transactions match your current filters.
              </p>
            )}
          </ul>
        </div>
      </div>
       <style>{`
            .control-input {
                @apply bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2;
            }
        `}</style>
    </div>
  );
};

export default TransactionModal;