import React, { useState, useMemo, useEffect, useRef } from 'react';
import { EditIcon, SearchIcon, SortAscIcon, SortDescIcon, ExportIcon, ChevronDownIcon, CsvIcon, ExcelIcon, PdfIcon, TrashIcon, categoryIcons } from './Icons';

const TransactionModal = ({ isOpen, onClose, title, transactions, type, categories, onUpdateCategory, onUpdateDescription, onDeleteTransaction, onUpdateNotes }: any) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [editingNotesIndex, setEditingNotesIndex] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // State for animations and gestures
  const [updatedInfo, setUpdatedInfo] = useState<{ index: number, type: 'category' | 'description' | 'notes'} | null>(null);
  const [swipedIndex, setSwipedIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [confirmingDeleteIndex, setConfirmingDeleteIndex] = useState<number | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ transaction: any, originalIndex: number, type: 'credit' | 'debit' } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);
  const listRef = useRef(null);
  
  const categoryDetailsMap = useMemo(() => new Map(categories.map((c: any) => [c.name, { icon: c.icon || 'other' }])), [categories]);
  
  const handleUndoDelete = () => {
    if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
    }
    setLastDeleted(null);
  };
  
  const handleClose = () => {
      handleUndoDelete(); // Cancel any pending delete on close
      onClose();
  };


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
      setEditingNotesIndex(null);
      setDeletingIndex(null);
      setConfirmingDeleteIndex(null);
      setLastDeleted(null); // Clear any undo state when modal opens
    } else {
        // Cleanup on close
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = null;
        }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEditing = (index: number, description: string) => {
    setSwipedIndex(null);
    setEditingIndex(index);
    setEditingDescription(description);
  };
  
  const handleStartEditingNotes = (index: number, notes: string) => {
    setSwipedIndex(null);
    setEditingNotesIndex(index);
    setEditingNotes(notes || '');
  };

  const triggerUpdateAnimation = (index: number, type: 'category' | 'description' | 'notes') => {
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

  const handleSaveNotes = (index: number) => {
    if (index === null || !onUpdateNotes) return;

    const originalTx = transactions[index];
    if (originalTx?.notes !== editingNotes) {
        onUpdateNotes(type, index, editingNotes);
        triggerUpdateAnimation(index, 'notes');
    }
    setEditingNotesIndex(null);
  };
  
  const handleCategoryChange = (index: number, newCategory: string) => {
    if (transactions[index]?.category !== newCategory) {
        onUpdateCategory(index, newCategory);
        triggerUpdateAnimation(index, 'category');
    }
  };
  
  const requestDelete = (index: number) => {
    setConfirmingDeleteIndex(index);
    setSwipedIndex(null); // Close the swipe view
  };

  const cancelDelete = () => {
    setConfirmingDeleteIndex(null);
  };

  const executeDelete = (index: number) => {
    setConfirmingDeleteIndex(null);

    // Immediately commit any previously pending deletion
    if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
    }
    if (lastDeleted) {
        onDeleteTransaction(lastDeleted.type, lastDeleted.originalIndex);
    }

    // Set up the new item for potential undo
    const itemToDelete = {
        transaction: transactions[index],
        originalIndex: index,
        type: type
    };
    setLastDeleted(itemToDelete);

    // Start timer for permanent deletion
    undoTimeoutRef.current = window.setTimeout(() => {
        onDeleteTransaction(itemToDelete.type, itemToDelete.originalIndex);
        setLastDeleted(current => 
            (current && current.originalIndex === itemToDelete.originalIndex) ? null : current
        );
        undoTimeoutRef.current = null;
    }, 5000); // 5 seconds
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
    if (searchTerm) filtered = filtered.filter(tx => tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || (tx.notes && tx.notes.toLowerCase().includes(searchTerm.toLowerCase())));
    if (type === 'debit' && selectedCategory !== 'All') {
        filtered = filtered.filter(tx => tx.category === selectedCategory);
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
  
  const handleExportViewCSV = () => {
    const headers = type === 'debit' ? "Date,Description,Category,Amount,Notes\n" : "Date,Description,Amount,Notes\n";
    const rows = processedTransactions.map(tx => {
        const description = `"${tx.description.replace(/"/g, '""')}"`;
        const notes = `"${(tx.notes || '').replace(/"/g, '""')}"`;
        const common = `${tx.date},${description}`;
        return type === 'debit' ? `${common},${tx.category},${tx.amount},${notes}` : `${common},${tx.amount},${notes}`;
    }).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", getFilename('current-view', 'csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExportViewXLSX = () => {
    const data = processedTransactions.map(tx => {
        const row: any = { Date: tx.date, Description: tx.description };
        if (type === 'debit') {
            row.Category = tx.category;
        }
        row.Amount = tx.amount;
        row.Notes = tx.notes || '';
        return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, getFilename('current-view', 'xlsx'));
  };

  const addPdfWatermark = (doc: any) => {
    const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(50);
        doc.setTextColor(150);
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({opacity: 0.1}));
        doc.text("BBaala", doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() / 2, { align: 'center', angle: 45 });
        doc.restoreGraphicsState();
      }
  };
  
  const handleExportViewPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const head = type === 'debit'
        ? [['Date', 'Description', 'Category', 'Amount', 'Notes']]
        : [['Date', 'Description', 'Amount', 'Notes']];
    
    const body = processedTransactions.map(tx => {
        const row: (string | number)[] = [ tx.date, tx.description ];
        if (type === 'debit') {
            row.push((tx as any).category);
        }
        row.push(tx.amount.toFixed(2));
        row.push((tx as any).notes || '');
        return row;
    });

    doc.text(`${title} - Current View`, 14, 15);
    (doc as any).autoTable({
        head: head,
        body: body,
        startY: 25,
        theme: 'grid',
    });

    addPdfWatermark(doc);
    doc.save(getFilename('current-view', 'pdf'));
  };

  const groupTransactionsByCategory = (txs: any[]) => txs.reduce((acc, tx) => {
      const category = tx.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tx);
      return acc;
  }, {} as { [key: string]: any[] });

  const handleExportCategoryCSV = () => {
    if (type !== 'debit') return;
    const grouped = groupTransactionsByCategory(processedTransactions);
    let csvContent = "data:text/csv;charset=utf-8,Category,Date,Description,Amount,Notes\n";

    for (const category in grouped) {
        const rows = grouped[category].map(tx => 
            `${category},${tx.date},"${tx.description.replace(/"/g, '""')}",${tx.amount},"${(tx.notes || '').replace(/"/g, '""')}"`
        ).join("\n");
        csvContent += rows + "\n";
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", getFilename('by-category', 'csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExportCategoryXLSX = () => {
    if (type !== 'debit') return;
    const workbook = XLSX.utils.book_new();
    const grouped = groupTransactionsByCategory(processedTransactions);

    for (const category in grouped) {
        const data = grouped[category].map(tx => ({
            Date: tx.date,
            Description: tx.description,
            Amount: tx.amount,
            Notes: tx.notes || ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const sheetName = category.replace(/[\\/*?[\]]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
    
    XLSX.writeFile(workbook, getFilename('by-category', 'xlsx'));
  };

  const handleExportCategoryPDF = () => {
    if (type !== 'debit') return; 
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`${title} - Grouped by Category`, 14, 15);

    const grouped = groupTransactionsByCategory(processedTransactions);
    let startY = 25;

    for (const category in grouped) {
        if (Object.prototype.hasOwnProperty.call(grouped, category)) {
            const transactions = grouped[category];
            const body = transactions.map(tx => [tx.date, tx.description, tx.amount.toFixed(2), tx.notes || '']);
            
            const lastTable = (doc as any).autoTable.previous;
            if (lastTable && lastTable.finalY) {
                startY = lastTable.finalY + 15;
            }

            doc.setFontSize(12);
            doc.text(category, 14, startY - 4);

            (doc as any).autoTable({
                head: [['Date', 'Description', 'Amount', 'Notes']],
                body: body,
                startY: startY,
                theme: 'grid',
            });
        }
    }

    addPdfWatermark(doc);
    doc.save(getFilename('by-category', 'pdf'));
  };

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
  const swipedItemRef = useRef<HTMLDivElement | null>(null);

  const handleSwipeStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>, index: number) => {
    if (confirmingDeleteIndex !== null) return;
    setSwipedIndex(index);
    swipeStartPos.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
    swipeDelta.current = 0;
    swipedItemRef.current = e.currentTarget;
    swipedItemRef.current.style.transition = 'none';
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={handleClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4 animate-fade-in-up" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white whitespace-nowrap">{title}</h2>
          <div className="flex items-center gap-4">
             {/* ... Export Menu ... */}
             <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
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
                const isDebit = type === 'debit';
                const isEditingDesc = editingIndex === originalIndex;
                const isEditingNotes = editingNotesIndex === originalIndex;
                const isPendingDelete = lastDeleted?.originalIndex === originalIndex;
                
                const isConfirmingDelete = confirmingDeleteIndex === originalIndex;
                
                const rowClass = index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50';
                const deleteClass = deletingIndex === originalIndex ? 'animate-slide-out' : '';
                const descriptionFlashClass = (updatedInfo?.index === originalIndex && updatedInfo?.type === 'description') ? 'animate-flash' : '';
                const notesFlashClass = (updatedInfo?.index === originalIndex && updatedInfo?.type === 'notes') ? 'animate-flash' : '';
                const categoryFlashClass = (updatedInfo?.index === originalIndex && updatedInfo?.type === 'category') ? 'animate-flash-border' : '';
                
                const categoryDetails = isDebit ? categoryDetailsMap.get(tx.category) : null;
                const IconComponent = categoryDetails ? categoryIcons[(categoryDetails as { icon: string }).icon] || categoryIcons.other : null;

                return (
                  <li key={originalIndex} className={`relative overflow-hidden transition-all duration-300 ${deleteClass} ${isPendingDelete ? 'is-hiding' : ''}`}>
                    {isConfirmingDelete ? (
                       <div className={`${rowClass} flex flex-col sm:flex-row items-center justify-center text-center sm:text-left p-4 min-h-[5.5rem] border-b border-gray-200 dark:border-gray-600`}>
                            <p className="font-semibold text-gray-700 dark:text-gray-200 sm:mr-4 mb-3 sm:mb-0">Are you sure you want to delete this transaction?</p>
                            <div className="flex gap-2 flex-shrink-0">
                                <button onClick={cancelDelete} className="px-4 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                                <button onClick={() => executeDelete(originalIndex)} className="px-4 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Confirm</button>
                            </div>
                        </div>
                    ) : (
                    <>
                    <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
                       <button onClick={() => requestDelete(originalIndex)} className="text-white p-2 rounded-full hover:bg-red-600 transition-colors">
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
                      className={`${rowClass} flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors group border-b border-gray-200 dark:border-gray-600 relative z-10 cursor-grab`}
                    >
                        <div className="flex-1 pr-4 w-full mb-2 sm:mb-0 space-y-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400">{tx.date}</div>
                           {isEditingDesc ? (
                                <input type="text" value={editingDescription} onChange={(e) => setEditingDescription(e.target.value)} onBlur={() => handleSaveDescription(originalIndex)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDescription(originalIndex); if (e.key === 'Escape') setEditingIndex(null); }} className="form-input-sm" autoFocus onClick={(e) => e.stopPropagation()}/>
                            ) : (
                                <div className={`flex items-start ${descriptionFlashClass} rounded px-1`}>
                                    {IconComponent && <IconComponent className="w-4 h-4 mr-2 mt-0.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />}
                                    <span className="text-gray-700 dark:text-gray-300 text-sm flex-1">{tx.description}</span>
                                    {onUpdateDescription && (
                                        <button onClick={(e) => { e.stopPropagation(); handleStartEditing(originalIndex, tx.description); }} className="ml-2 p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" aria-label={`Edit description for ${tx.description}`}>
                                        <EditIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}

                             {isEditingNotes ? (
                                <textarea value={editingNotes} onChange={(e) => setEditingNotes(e.target.value)} onBlur={() => handleSaveNotes(originalIndex)} className="form-input-sm w-full" autoFocus onClick={(e) => e.stopPropagation()} placeholder="Add a note..."/>
                            ) : (
                                <div className={`flex items-start pl-1 pr-1 py-0.5 rounded ${notesFlashClass}`}>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex-1 italic whitespace-pre-wrap">{tx.notes || 'No notes'}</p>
                                    <button onClick={(e) => { e.stopPropagation(); handleStartEditingNotes(originalIndex, tx.notes); }} className="ml-2 p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" aria-label={`Edit notes for ${tx.description}`}>
                                        <EditIcon className="w-3 h-3" />
                                    </button>
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
                                className={`control-input p-2 w-full ${categoryFlashClass}`}
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
                    </>
                    )}
                  </li>
                )
              })
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No transactions match your current filters.</p>
            )}
          </ul>
        </div>

        {lastDeleted && (
            <div className="p-3 bg-gray-700 dark:bg-gray-900 text-white flex justify-between items-center animate-fade-in-up border-t border-gray-600 dark:border-gray-700">
                <span className="text-sm">Transaction deleted.</span>
                <button onClick={handleUndoDelete} className="font-semibold uppercase text-sm text-blue-400 hover:text-blue-300 tracking-wider">Undo</button>
            </div>
        )}
      </div>
       <style>{`
        .control-input { @apply bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2; }
        .form-input-sm { @apply bg-white dark:bg-gray-600 border border-blue-400 dark:border-blue-500 text-gray-900 dark:text-gray-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-1; }
        .is-hiding {
            max-height: 0;
            opacity: 0;
            transform: scaleY(0);
            padding-top: 0;
            padding-bottom: 0;
            border-width: 0;
            margin-bottom: -1px; /* Overlap border */
        }
        `}</style>
    </div>
  );
};

export default TransactionModal;