import React, { useState, useCallback } from 'react';
import { analyzeExpensePdf } from 'services/geminiService';
import { ExpenseSummary, ModalType, Transaction, DebitTransaction } from './types';
import Dashboard from 'components/Dashboard';
import TransactionModal from 'components/TransactionModal';
import Spinner from 'components/Spinner';
import { FileIcon, LogoIcon } from 'components/Icons';

const CATEGORIES = ['Food & Dining', 'Transportation', 'Shopping', 'Utilities', 'Entertainment', 'Housing', 'Health', 'Other'];

function App() {
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; retryable?: boolean } | null>(null);
  const [modal, setModal] = useState<{ type: ModalType; transactions: (Transaction | DebitTransaction)[] } | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [lastFile, setLastFile] = useState<File | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError({ message: 'Please upload a valid PDF file.' });
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
      const result = await analyzeExpensePdf(file);
      setSummary(result);
    } catch (err) {
      if (err instanceof Error) {
        setError({ message: err.message, retryable: true });
      } else {
        setError({ message: 'An unknown error occurred.', retryable: true });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleRetry = () => {
    if (lastFile) {
      processPdf(lastFile);
    }
  };

  const openModal = (type: ModalType) => {
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
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  };

  const handleUpdateCategory = (transactionIndex: number, newCategory: string) => {
    if (!summary) return;

    const newSummary = JSON.parse(JSON.stringify(summary)) as ExpenseSummary;
    const transaction = newSummary.debitTransactions[transactionIndex];
    if (!transaction) return;

    const oldCategory = transaction.category;
    const transactionAmount = transaction.amount;

    if (oldCategory === newCategory) return;

    transaction.category = newCategory;

    const oldCategorySummary = newSummary.debitSummary.find(s => s.category === oldCategory);
    if (oldCategorySummary) {
      oldCategorySummary.totalAmount -= transactionAmount;
    }
    newSummary.debitSummary = newSummary.debitSummary.filter(s => s.totalAmount > 0.01);

    const newCategorySummary = newSummary.debitSummary.find(s => s.category === newCategory);
    if (newCategorySummary) {
      newCategorySummary.totalAmount += transactionAmount;
    } else {
      newSummary.debitSummary.push({ category: newCategory, totalAmount: transactionAmount });
    }

    setSummary(newSummary);

    if (modal && modal.type === ModalType.DEBIT) {
      const updatedTransactions = [...newSummary.debitTransactions];
      setModal(prevModal => prevModal ? { ...prevModal, transactions: updatedTransactions } : null);
    }
  };

  const handleUpdateDescription = (transactionIndex: number, newDescription: string) => {
    if (!summary || !newDescription) return;

    const newSummary = JSON.parse(JSON.stringify(summary)) as ExpenseSummary;
    const transaction = newSummary.debitTransactions[transactionIndex];
    if (!transaction || transaction.description === newDescription) return;
    
    transaction.description = newDescription;
    setSummary(newSummary);

    if (modal && modal.type === ModalType.DEBIT) {
      const updatedTransactions = [...newSummary.debitTransactions];
      setModal(prevModal => prevModal ? { ...prevModal, transactions: updatedTransactions } : null);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <header className="bg-white dark:bg-gray-800/50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <LogoIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Expense Analyzer</h1>
          </div>
          { (summary || error || isLoading) && (
             <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Analyze Another
            </button>
          )}
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
          <div className="text-center py-16">
            <Spinner />
            <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-300">Analyzing your document...</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{fileName}</p>
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
          <Dashboard summary={summary} onCardClick={openModal} />
        )}
      </main>
      
      {modal && (
        <TransactionModal
          isOpen={!!modal}
          onClose={closeModal}
          title={modal.type === ModalType.CREDIT ? 'Credit Transactions' : 'Debit Transactions'}
          transactions={modal.transactions}
          type={modal.type}
          categories={CATEGORIES}
          onUpdateCategory={handleUpdateCategory}
          onUpdateDescription={handleUpdateDescription}
        />
      )}
    </div>
  );
}

export default App;
