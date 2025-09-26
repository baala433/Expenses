import React, { useState, useCallback, useEffect } from 'react';
import { analyzeExpensePdf, askFinancialCopilot, DocumentAnalysisError, NetworkError, ApiKeyError } from './services/geminiService';
import Dashboard from './components/Dashboard';
import TransactionModal from './components/TransactionModal';
import ReceiptScannerModal from './components/ReceiptScannerModal';
import LoadingIndicator from './components/LoadingIndicator';
import { FileIcon, LogoIcon, LogoutIcon, MoonIcon, SunIcon } from './components/Icons';
import Chatbot from './components/Chatbot';
import FinancialCopilot from './components/FinancialCopilot';
import LoginPage from './components/LoginPage';
import CategoryManagerModal from './components/CategoryManagerModal';

const INITIAL_CATEGORIES = [
    { name: 'Food & Dining', color: '#0088FE' },
    { name: 'Transportation', color: '#00C49F' },
    { name: 'Shopping', color: '#FFBB28' },
    { name: 'Utilities', color: '#FF8042' },
    { name: 'Entertainment', color: '#AF19FF' },
    { name: 'Housing', color: '#FF1943' },
    { name: 'Health', color: '#19D7FF' },
    { name: 'Other', color: '#6c757d' },
];

const LOADING_MESSAGES = [
  "Initializing secure analysis...",
  "Parsing PDF structure...",
  "Extracting transactional data points...",
  "Applying Gemini AI for expense categorization...",
  "Aggregating financial summary...",
  "Constructing interactive dashboard...",
  "Finalizing your financial breakdown...",
];

const ModalType = {
  CREDIT: 'credit',
  DEBIT: 'debit',
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [fileName, setFileName] = useState('');
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // State for Financial Copilot
  const [copilotMessages, setCopilotMessages] = useState([]);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  
  // State for Receipt Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // State for Category Manager
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  
  // State for Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  
  // State for Categories
  const [categories, setCategories] = useState(() => {
    try {
      const savedCategories = localStorage.getItem('userCategories');
      return savedCategories ? JSON.parse(savedCategories) : INITIAL_CATEGORIES;
    } catch (e) {
      return INITIAL_CATEGORIES;
    }
  });
  
  useEffect(() => {
    localStorage.setItem('userCategories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      setLoadingMessageIndex(0); // Reset to first message
      interval = window.setInterval(() => {
        setLoadingMessageIndex(prevIndex => {
          if (prevIndex >= LOADING_MESSAGES.length - 1) {
            clearInterval(interval);
            return prevIndex;
          }
          return prevIndex + 1;
        });
      }, 1500);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLoading]);
  
  useEffect(() => {
    if (summary) {
      setCopilotMessages([
        {
          sender: 'ai',
          text: "Welcome to your Financial Copilot! I've analyzed your statement. Ask me anything, like 'What's my largest expense?' or 'Summarize my spending on Shopping'."
        }
      ]);
    } else {
      setCopilotMessages([]);
    }
  }, [summary]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError({ message: 'Please upload a valid PDF file.', retryable: false });
        return;
      }
      setFileName(file.name);
      setLastFile(file);
      await processPdf(file);
    }
  };
  
  const processPdf = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const categoryNames = categories.map(c => c.name);
      const result = await analyzeExpensePdf(file, categoryNames);
      setSummary(result);
    } catch (err) {
      if (err instanceof NetworkError) {
        setError({ message: err.message, retryable: true });
      } else if (err instanceof DocumentAnalysisError || err instanceof ApiKeyError) {
        setError({ message: err.message, retryable: false });
      } else if (err instanceof Error) {
        setError({ message: err.message, retryable: true });
      } else {
        setError({ message: 'An unknown error occurred.', retryable: true });
      }
    } finally {
      setIsLoading(false);
    }
  }, [categories]);
  
  const handleRetry = () => {
    if (lastFile) {
      processPdf(lastFile);
    }
  };

  const openModal = (type: 'credit' | 'debit') => {
    if (!summary) return;
    const transactions = type === ModalType.CREDIT ? summary.creditTransactions : summary.debitTransactions;
    setModal({ type, transactions });
  };

  const closeModal = () => {
    setModal(null);
  };

  const handleReset = () => {
    setSummary(null);
    setError(null);
    setIsLoading(false);
    setFileName('');
    setLastFile(null);
    setCopilotMessages([]);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  };
  
  const handleLogout = () => {
    handleReset();
    setIsAuthenticated(false);
  };
  
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  // Category Management Handlers
  const handleUpdateCategoryList = (newCategoryList) => {
    setCategories(newCategoryList);
  };
  
  const handleCategoryUpdateInTransactions = (oldName, newName) => {
      if (!summary || oldName === newName) return;
      
      const newSummary = JSON.parse(JSON.stringify(summary));

      // Update debit transactions
      newSummary.debitTransactions.forEach(tx => {
        if (tx.category === oldName) {
            tx.category = newName;
        }
      });
      
      // Update debit summary
      const oldSummaryItem = newSummary.debitSummary.find(s => s.category === oldName);
      const newSummaryItem = newSummary.debitSummary.find(s => s.category === newName);
      
      if(oldSummaryItem) {
          if (newSummaryItem) { // Merge into existing category
              newSummaryItem.totalAmount += oldSummaryItem.totalAmount;
              newSummary.debitSummary = newSummary.debitSummary.filter(s => s.category !== oldName);
          } else { // Just rename the category
              oldSummaryItem.category = newName;
          }
      }
      
      setSummary(newSummary);
  };

  const handleCategoryDeleteInTransactions = (deletedName) => {
      if (!summary) return;
      handleCategoryUpdateInTransactions(deletedName, 'Other');
  };

  // Transaction Update Handlers
  const handleUpdateCategory = (transactionIndex: number, newCategory: string) => {
    if (!summary) return;

    const newSummary = JSON.parse(JSON.stringify(summary));
    const transaction = newSummary.debitTransactions[transactionIndex];
    if (!transaction) return;

    const oldCategory = transaction.category;
    const transactionAmount = transaction.amount;

    if (oldCategory === newCategory) return;

    transaction.category = newCategory;

    const oldCategorySummary = newSummary.debitSummary.find((s: any) => s.category === oldCategory);
    if (oldCategorySummary) {
      oldCategorySummary.totalAmount -= transactionAmount;
    }
    newSummary.debitSummary = newSummary.debitSummary.filter((s: any) => s.totalAmount > 0.01);

    const newCategorySummary = newSummary.debitSummary.find((s: any) => s.category === newCategory);
    if (newCategorySummary) {
      newCategorySummary.totalAmount += transactionAmount;
    } else {
      newSummary.debitSummary.push({ category: newCategory, totalAmount: transactionAmount });
    }

    setSummary(newSummary);

    if (modal && modal.type === ModalType.DEBIT) {
      setModal(prevModal => prevModal ? { ...prevModal, transactions: newSummary.debitTransactions } : null);
    }
  };

  const handleUpdateDescription = (transactionIndex: number, newDescription: string) => {
    if (!summary || !newDescription) return;

    const newSummary = JSON.parse(JSON.stringify(summary));
    // NOTE: This assumes we are only editing debit descriptions, which is current app behavior.
    const transaction = newSummary.debitTransactions[transactionIndex];
    if (!transaction || transaction.description === newDescription) return;
    
    transaction.description = newDescription;
    setSummary(newSummary);

    if (modal && modal.type === ModalType.DEBIT) {
      setModal(prevModal => prevModal ? { ...prevModal, transactions: newSummary.debitTransactions } : null);
    }
  };
  
  const handleDeleteTransaction = (type: 'credit' | 'debit', index: number) => {
    if (!summary) return;
    
    const newSummary = JSON.parse(JSON.stringify(summary));

    if (type === 'credit') {
        const [deletedTx] = newSummary.creditTransactions.splice(index, 1);
        newSummary.totalCredit -= deletedTx.amount;
    } else {
        const [deletedTx] = newSummary.debitTransactions.splice(index, 1);
        newSummary.totalDebit -= deletedTx.amount;
        
        const categorySummary = newSummary.debitSummary.find(s => s.category === deletedTx.category);
        if (categorySummary) {
            categorySummary.totalAmount -= deletedTx.amount;
        }
        newSummary.debitSummary = newSummary.debitSummary.filter((s: any) => s.totalAmount > 0.01);
    }
    
    setSummary(newSummary);
    if (modal) {
        const transactions = type === 'credit' ? newSummary.creditTransactions : newSummary.debitTransactions;
        setModal({ type, transactions });
    }
  };

  const handleAddScannedTransaction = (newTx: { description: string, date: string, amount: number, category: string }) => {
    if (!summary) return;

    const newSummary = JSON.parse(JSON.stringify(summary));
    
    newSummary.debitTransactions.unshift(newTx);
    newSummary.totalDebit += newTx.amount;
    
    const categorySummary = newSummary.debitSummary.find((s: any) => s.category === newTx.category);
    if (categorySummary) {
      categorySummary.totalAmount += newTx.amount;
    } else {
      newSummary.debitSummary.push({ category: newTx.category, totalAmount: newTx.amount });
    }
    
    setSummary(newSummary);
    setIsScannerOpen(false);
  };
  
  const getFilename = (exportType: string, extension: string) => `${exportType}-report-${new Date().toISOString().split('T')[0]}.${extension}`;

  const handleExportAllXLSX = () => {
      if (!summary) return;
      const workbook = XLSX.utils.book_new();

      const creditData = summary.creditTransactions.map((tx: any) => ({ Date: tx.date, Description: tx.description, Amount: tx.amount }));
      const creditSheet = XLSX.utils.json_to_sheet(creditData, { origin: 'A2' });
      XLSX.utils.sheet_add_aoa(creditSheet, [['Generated by BBaala']], { origin: 'A1' });
      XLSX.utils.book_append_sheet(workbook, creditSheet, "Credit Transactions");

      const debitData = summary.debitTransactions.map((tx: any) => ({ Date: tx.date, Description: tx.description, Amount: tx.amount, Category: tx.category }));
      const debitSheet = XLSX.utils.json_to_sheet(debitData, { origin: 'A2' });
      XLSX.utils.sheet_add_aoa(debitSheet, [['Generated by BBaala']], { origin: 'A1' });
      XLSX.utils.book_append_sheet(workbook, debitSheet, "Debit Transactions");

      XLSX.writeFile(workbook, getFilename('full-financial', 'xlsx'));
  };

  const handleExportAllPDF = () => {
      if (!summary) return;
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text("Full Financial Report", 14, 15);

      const creditBody = summary.creditTransactions.map((tx: any) => [tx.date, tx.description, tx.amount.toFixed(2)]);
      (doc as any).autoTable({
          head: [['Credit Transactions']], startY: 25, theme: 'striped', headStyles: { fillColor: [40, 167, 69] }
      });
      (doc as any).autoTable({
          head: [['Date', 'Description', 'Amount']], body: creditBody, startY: (doc as any).autoTable.previous.finalY, theme: 'grid',
      });

      const debitBody = summary.debitTransactions.map((tx: any) => [tx.date, tx.description, tx.amount.toFixed(2), tx.category]);
      (doc as any).autoTable({
          head: [['Debit Transactions']], startY: (doc as any).autoTable.previous.finalY + 10, theme: 'striped', headStyles: { fillColor: [220, 53, 69] }
      });
      (doc as any).autoTable({
          head: [['Date', 'Description', 'Amount', 'Category']], body: debitBody, startY: (doc as any).autoTable.previous.finalY, theme: 'grid',
      });

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
      doc.save(getFilename('full-financial', 'pdf'));
  };

  const handleExportBreakdownXLSX = () => {
    if (!summary?.debitSummary) return;
    const workbook = XLSX.utils.book_new();
    const breakdownData = summary.debitSummary.map((item: any) => ({ Category: item.category, 'Total Amount': item.totalAmount }));
    const breakdownSheet = XLSX.utils.json_to_sheet(breakdownData, { origin: 'A2' });
    XLSX.utils.sheet_add_aoa(breakdownSheet, [['Generated by BBaala']], { origin: 'A1' });
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, "Expense Breakdown");
    XLSX.writeFile(workbook, getFilename('expense-breakdown', 'xlsx'));
  };

  const handleExportBreakdownPDF = () => {
      if (!summary?.debitSummary) return;
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text("Expense Breakdown by Category", 14, 15);
      const body = summary.debitSummary.map((item: any) => [item.category, new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.totalAmount)]);
      (doc as any).autoTable({ head: [['Category', 'Total Amount']], body: body, startY: 25, theme: 'grid' });
      
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
      doc.save(getFilename('expense-breakdown', 'pdf'));
  };

  const handleCopilotSendMessage = async (message: string) => {
    if (!message.trim() || isCopilotLoading || !summary) return;
    const newUserMessage = { text: message, sender: 'user' };
    setCopilotMessages(prev => [...prev, newUserMessage]);
    setIsCopilotLoading(true);
    try {
      const aiResponse = await askFinancialCopilot(message, summary);
      const newAiMessage = { text: aiResponse, sender: 'ai' };
      setCopilotMessages(prev => [...prev, newAiMessage]);
    } catch (err) {
      const errorMessage = { text: "Sorry, I'm having trouble connecting. Please try again.", sender: 'ai' };
      setCopilotMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsCopilotLoading(false);
    }
  };
  
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 font-sans">
      <header className="bg-white dark:bg-gray-800/50 shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <LogoIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">BBaala Expense Analyser</h1>
          </div>
          <div className="flex items-center space-x-4">
            { (summary || error || isLoading) && (
               <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Analyze Another
              </button>
            )}
             <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
            </button>
             <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              aria-label="Logout"
            >
              <span>Logout</span>
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {!summary && !isLoading && !error && (
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="flex justify-center mb-6">
              <FileIcon className="h-16 w-16 text-gray-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-3">Upload Your Bank Statement</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Get an instant breakdown of your finances. Securely analyze your PDF statement in seconds.
            </p>
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Select PDF File
              </label>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="application/pdf" />
            </div>
          </div>
        )}

        {isLoading && (
          <div className="max-w-2xl mx-auto text-center py-16 animate-fade-in">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-8">Analyzing Your Statement</h2>
            <div className="bg-white dark:bg-gray-800/50 p-6 sm:p-8 rounded-xl shadow-lg">
              <LoadingIndicator 
                stages={LOADING_MESSAGES} 
                currentStageIndex={loadingMessageIndex} 
              />
            </div>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">{fileName}</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="max-w-md mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center" role="alert">
            <strong className="font-bold">Analysis Failed: </strong>
            <span className="block sm:inline">{error.message}</span>
            {error.retryable && (
                <div className="mt-4">
                    <button
                        onClick={handleRetry}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Retry
                    </button>
                </div>
            )}
          </div>
        )}

        {summary && !isLoading && (
          <>
            <Dashboard 
              summary={summary}
              categories={categories}
              onCardClick={openModal} 
              onExportXLSX={handleExportAllXLSX}
              onExportPDF={handleExportAllPDF}
              onExportBreakdownXLSX={handleExportBreakdownXLSX}
              onExportBreakdownPDF={handleExportBreakdownPDF}
              onOpenScanner={() => setIsScannerOpen(true)}
              onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
            />
            <FinancialCopilot
              messages={copilotMessages}
              onSendMessage={handleCopilotSendMessage}
              isLoading={isCopilotLoading}
            />
          </>
        )}
      </main>
      
      {modal && (
        <TransactionModal
          isOpen={!!modal}
          onClose={closeModal}
          title={modal.type === ModalType.CREDIT ? 'Credit Transactions' : 'Debit Transactions'}
          transactions={modal.transactions}
          type={modal.type}
          categories={categories}
          onUpdateCategory={handleUpdateCategory}
          onUpdateDescription={handleUpdateDescription}
          onDeleteTransaction={handleDeleteTransaction}
        />
      )}
      
      {isScannerOpen && (
        <ReceiptScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onAddTransaction={handleAddScannedTransaction}
            categories={categories}
        />
      )}
      
      {isCategoryManagerOpen && (
          <CategoryManagerModal
            isOpen={isCategoryManagerOpen}
            onClose={() => setIsCategoryManagerOpen(false)}
            categories={categories}
            onUpdateCategories={handleUpdateCategoryList}
            onCategoryNameChange={handleCategoryUpdateInTransactions}
            onCategoryDelete={handleCategoryDeleteInTransactions}
          />
      )}

      <Chatbot />
    </div>
  );
}

export default App;