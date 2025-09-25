
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { EditIcon, SearchIcon, SortAscIcon, SortDescIcon, ExportIcon, ChevronDownIcon } from './Icons';

const TransactionModal = ({ isOpen, onClose, title, transactions, type, categories, onUpdateCategory, onUpdateDescription }: any) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // FIX: Corrected typo from `exportMenu-ref` to `exportMenuRef`.
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Set default date range to the current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];

      setStartDate(toYYYYMMDD(firstDay));
      setEndDate(toYYYYMMDD(lastDay));
      
      // Reset other filters
      setSearchTerm('');
      setSelectedCategory('All');
      setSortConfig({ key: 'date', direction: 'desc' });
      setIsExportMenuOpen(false);
      setEditingIndex(null);
    }
  }, [isOpen]);

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
  
  const amountColorClass = type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  const uniqueCategories = useMemo(() => {
    if (type !== 'debit' || !categories) return [];
    // FIX: Explicitly type the Set and check if the category is a string to ensure type safety.
    const all = new Set<string>(categories);
    transactions.forEach((tx: any) => {
      if ('category' in tx && typeof tx.category === 'string') {
        all.add(tx.category);
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

    if (type === 'debit') {
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(tx => 'category' in tx && tx.category === selectedCategory);
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

  const getFilename = (exportType: string, extension: string) => `${type}-${exportType}-${new Date().toISOString().split('T')[0]}.${extension}`;

  const handleExportViewCSV = () => {
    if (processedTransactions.length === 0) return;
    const isDebit = type === 'debit';
    const headers = isDebit ? ['Date', 'Description', 'Amount', 'Category'] : ['Date', 'Description', 'Amount'];
    const rows = processedTransactions.map(tx => {
      const description = `"${tx.description.replace(/"/g, '""')}"`;
      const common = [tx.date, description, tx.amount];
      return isDebit && 'category' in tx ? [...common, tx.category].join(',') : common.join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getFilename('transactions', 'csv');
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportViewXLSX = () => {
    if (processedTransactions.length === 0) return;
    const isDebit = type === 'debit';
    const data = processedTransactions.map(tx => {
        // FIX: Define `row` with an index signature to allow adding properties dynamically.
        const row: { [key: string]: any } = { Date: tx.date, Description: tx.description, Amount: tx.amount };
        if (isDebit && 'category' in tx) row.Category = tx.category;
        return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(data, { origin: 'A2' });
    XLSX.utils.sheet_add_aoa(worksheet, [['Generated by BBaala']], { origin: 'A1' });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, getFilename('transactions', 'xlsx'));
  };

  const addPdfWatermark = (doc: any) => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(50);
        doc.setTextColor(150);
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({opacity: 0.1}));
        doc.text("BBaala", doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() / 2, {
          align: 'center',
          angle: 45
        });
        doc.restoreGraphicsState();
    }
  }

  const handleExportViewPDF = () => {
    if (processedTransactions.length === 0) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const isDebit = type === 'debit';
    
    const tableHeaders = isDebit ? ['Date', 'Description', 'Amount', 'Category'] : ['Date', 'Description', 'Amount'];
    const tableBody = processedTransactions.map(tx => {
        const common = [tx.date, tx.description, tx.amount.toFixed(2)];
        return isDebit && 'category' in tx ? [...common, tx.category] : common;
    });

    doc.text(title, 14, 15);
    (doc as any).autoTable({ head: [tableHeaders], body: tableBody, startY: 20 });
    
    addPdfWatermark(doc);
    doc.save(getFilename('transactions', 'pdf'));
  };

  const groupTransactionsByCategory = (txs: any[]) => txs.reduce((acc, tx) => {
      const category = tx.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tx);
      return acc;
  }, {} as { [key: string]: any[] });

  const handleExportCategoryCSV = () => {
    const debitTransactions = processedTransactions.filter(tx => 'category' in tx);
    if (debitTransactions.length === 0) return;

    // Sort by category, then by date as a secondary sort
    debitTransactions.sort((a, b) => {
        const categoryA = a.category || 'Uncategorized';
        const categoryB = b.category || 'Uncategorized';
        if (categoryA < categoryB) return -1;
        if (categoryA > categoryB) return 1;
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
    });

    const headers = ['Category', 'Date', 'Description', 'Amount'];
    const rows = debitTransactions.map(tx => {
      // Ensure description is properly quoted for CSV
      const description = `"${(tx.description || '').replace(/"/g, '""')}"`;
      return [tx.category || 'Uncategorized', tx.date, description, tx.amount].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getFilename('by-category', 'csv');
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportCategoryXLSX = () => {
    const debitTransactions = processedTransactions.filter(tx => 'category' in tx);
    if (debitTransactions.length === 0) return;
    
    const grouped = groupTransactionsByCategory(debitTransactions);
    const workbook = XLSX.utils.book_new();
    
    Object.keys(grouped).sort().forEach(category => {
      const data = grouped[category].map(tx => ({ Date: tx.date, Description: tx.description, Amount: tx.amount }));
      const worksheet = XLSX.utils.json_to_sheet(data, { origin: 'A2' });
      XLSX.utils.sheet_add_aoa(worksheet, [['Generated by BBaala']], { origin: 'A1' });
      // Sanitize sheet name for Excel
      const sheetName = category.replace(/[\/\\?*[\]:]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, getFilename('by-category', 'xlsx'));
  };

  const handleExportCategoryPDF = () => {
    const debitTransactions = processedTransactions.filter(tx => 'category' in tx);
    if (debitTransactions.length === 0) return;
    
    const grouped = groupTransactionsByCategory(debitTransactions);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let startY = 20;

    doc.text('Debit Transactions by Category', 14, 15);

    Object.keys(grouped).sort().forEach(category => {
      const tableBody = grouped[category].map(tx => [tx.date, tx.description, tx.amount.toFixed(2)]);
      (doc as any).autoTable({
        head: [[category]],
        startY: startY,
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94] }
      });
      (doc as any).autoTable({
        head: [['Date', 'Description', 'Amount']],
        body: tableBody,
        startY: (doc as any).autoTable.previous.finalY,
        theme: 'grid',
        didDrawPage: (data: any) => {
            // Reset startY for new page
            if (data.cursor.y > startY) {
                startY = data.cursor.y;
            }
        }
      });
      startY = (doc as any).autoTable.previous.finalY + 10;
    });

    addPdfWatermark(doc);
    doc.save(getFilename('by-category', 'pdf'));
  };

  const handleSort = (key: string) => {
    setSortConfig(current => {
        if (current.key === key && current.direction === 'asc') {
            return { key, direction: 'desc' };
        }
        return { key, direction: 'asc' };
    });
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
  
  const ExportMenuItem = ({ onClick, children }: { onClick: () => void, children: React.ReactNode }) => (
      <button
        onClick={() => { onClick(); setIsExportMenuOpen(false); }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-3"
        role="menuitem"
      >
        {children}
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
          <div className="flex items-center gap-4">
             <div className="relative" ref={exportMenuRef}>
                <button
                    onClick={() => setIsExportMenuOpen(prev => !prev)}
                    disabled={processedTransactions.length === 0}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Export options"
                >
                    <ExportIcon className="w-4 h-4" />
                    <span>Export</span>
                    <ChevronDownIcon className="w-4 h-4"/>
                </button>
                {isExportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10" role="menu" aria-orientation="vertical">
                      <div className="py-1">
                        <span className="block px-4 py-2 text-xs text-gray-400">Export Current View</span>
                        <ExportMenuItem onClick={handleExportViewCSV}><span>Export as CSV</span></ExportMenuItem>
                        <ExportMenuItem onClick={handleExportViewXLSX}><span>Export as Excel (.xlsx)</span></ExportMenuItem>
                        <ExportMenuItem onClick={handleExportViewPDF}><span>Export as PDF</span></ExportMenuItem>
                        {type === 'debit' && (
                          <>
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <span className="block px-4 py-2 text-xs text-gray-400">Category Reports</span>
                            <ExportMenuItem onClick={handleExportCategoryCSV}><span>Export by Category (CSV)</span></ExportMenuItem>
                            <ExportMenuItem onClick={handleExportCategoryXLSX}><span>Export by Category (Excel)</span></ExportMenuItem>
                            <ExportMenuItem onClick={handleExportCategoryPDF}><span>Export by Category (PDF)</span></ExportMenuItem>
                          </>
                        )}
                      </div>
                    </div>
                )}
             </div>
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
                {type === 'debit' && (
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
          <ul className="border-t border-gray-200 dark:border-gray-600">
            {processedTransactions.length > 0 ? (
              processedTransactions.map((tx, index) => {
                const originalIndex = transactions.findIndex((originalTx: any) => originalTx === tx);
                const isDebit = type === 'debit' && 'category' in tx;
                const debitTx = isDebit ? tx : null;
                const isEditing = isDebit && editingIndex === originalIndex;
                const rowClass = index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50';

                return (
                  <li key={originalIndex} className={`${rowClass} flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors group border-b border-gray-200 dark:border-gray-600`}>
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
