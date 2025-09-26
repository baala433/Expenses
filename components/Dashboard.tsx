import React, { useState, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SummaryCard from './SummaryCard';
import { CreditIcon, DebitIcon, ExportIcon, ChevronDownIcon, SparkleIcon, CameraIcon, ManageCategoriesIcon } from './Icons';
import { generateQuickSummary, generateCategorySummary } from '../services/geminiService';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-700 p-2 border border-gray-200 dark:border-gray-600 rounded shadow-lg">
        <p className="label text-gray-800 dark:text-gray-200">{`${payload[0].name} : ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

const ExportMenuItem = ({ onClick, closeMenu, children }: { onClick: () => void, closeMenu: () => void, children: React.ReactNode }) => (
  <button
    onClick={() => {
      onClick();
      closeMenu();
    }}
    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-3"
    role="menuitem"
  >
    {children}
  </button>
);


const Dashboard = ({ summary, categories, onCardClick, onExportXLSX, onExportPDF, onExportBreakdownXLSX, onExportBreakdownPDF, onOpenScanner, onOpenCategoryManager }: any) => {
  const categoryColorMap = new Map(categories.map((cat: any) => [cat.name, cat.color]));
  const chartData = summary.debitSummary.map((item: any) => ({ 
      name: item.category, 
      value: item.totalAmount,
      fill: categoryColorMap.get(item.category) || '#8884d8'
  }));

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [isBreakdownExportMenuOpen, setIsBreakdownExportMenuOpen] = useState(false);
  const breakdownExportMenuRef = useRef<HTMLDivElement>(null);
  
  const [quickSummary, setQuickSummary] = useState<{ text: string; error: string | null }>({ text: '', error: null });
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  
  const [categorySummary, setCategorySummary] = useState<{ category: string | null; text: string; isLoading: boolean; error: string | null }>({
    category: null,
    text: '',
    isLoading: false,
    error: null
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (breakdownExportMenuRef.current && !breakdownExportMenuRef.current.contains(event.target as Node)) {
        setIsBreakdownExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleGetQuickSummary = async () => {
    setIsSummaryLoading(true);
    setQuickSummary({ text: '', error: null });
    try {
      const result = await generateQuickSummary(summary.debitSummary);
      setQuickSummary({ text: result, error: null });
    } catch (err: any) {
      setQuickSummary({ text: '', error: err.message || 'Failed to generate summary.' });
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleGetCategorySummary = async (categoryName: string) => {
    if (categorySummary.category === categoryName && !categorySummary.isLoading) {
      setCategorySummary({ category: null, text: '', isLoading: false, error: null });
      return;
    }

    setCategorySummary({ category: categoryName, text: '', isLoading: true, error: null });
    
    try {
      const categoryTransactions = summary.debitTransactions.filter(
        (tx: any) => tx.category === categoryName
      );
      const result = await generateCategorySummary(categoryName, categoryTransactions);
      setCategorySummary({ category: categoryName, text: result, isLoading: false, error: null });
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setCategorySummary({ category: categoryName, text: '', isLoading: false, error: errorMessage || `Failed to generate summary for ${categoryName}.` });
    }
  };

  const handleDownloadSummaryPDF = () => {
    if (!quickSummary.text) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("Financial Quick Summary", 14, 22);
    doc.setFontSize(11);
    
    const textLines = doc.splitTextToSize(quickSummary.text, 180);
    doc.text(textLines, 14, 32);

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(50);
      doc.setTextColor(150);
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({opacity: 0.1}));
      doc.text("BBaala", doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() / 2, {
        align: 'center',
        angle: 45
      });
      doc.restoreGraphicsState();
    }

    doc.save(`quick-summary-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">BBaala Expense Analyser Dashboard</h2>
        <div className="flex items-center flex-wrap gap-2">
          <button
              onClick={onOpenScanner}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
              aria-label="Scan a new receipt"
          >
              <CameraIcon className="w-5 h-5" />
              <span>Scan Receipt</span>
          </button>
           <button
              onClick={onOpenCategoryManager}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
              aria-label="Manage expense categories"
          >
              <ManageCategoriesIcon className="w-5 h-5" />
              <span>Manage Categories</span>
          </button>
          <div className="relative" ref={exportMenuRef}>
              <button
                  onClick={() => setIsExportMenuOpen(prev => !prev)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                  aria-label="Export report options"
              >
                  <ExportIcon className="w-5 h-5" />
                  <span>Export Report</span>
                  <ChevronDownIcon className="w-4 h-4"/>
              </button>
              {isExportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10" role="menu" aria-orientation="vertical">
                      <div className="py-1">
                          <ExportMenuItem onClick={onExportXLSX} closeMenu={() => setIsExportMenuOpen(false)}>
                              <span>Export as Excel (.xlsx)</span>
                          </ExportMenuItem>
                          <ExportMenuItem onClick={onExportPDF} closeMenu={() => setIsExportMenuOpen(false)}>
                              <span>Export as PDF</span>
                          </ExportMenuItem>
                      </div>
                  </div>
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryCard
          title="Total Credit"
          amount={summary.totalCredit}
          icon={<CreditIcon />}
          onClick={() => onCardClick('credit')}
          color="green"
        />
        <SummaryCard
          title="Total Debit"
          amount={summary.totalDebit}
          icon={<DebitIcon />}
          onClick={() => onCardClick('debit')}
          color="red"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Expense Breakdown</h3>
          <div className="flex items-center gap-2">
            <button
                onClick={handleGetQuickSummary}
                disabled={isSummaryLoading}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-wait"
                aria-label="Get quick summary"
            >
                <SparkleIcon className="w-4 h-4" />
                <span>{isSummaryLoading ? 'Generating...' : 'Quick Summary'}</span>
            </button>
            <div className="relative" ref={breakdownExportMenuRef}>
              <button
                  onClick={() => setIsBreakdownExportMenuOpen(prev => !prev)}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                  aria-label="Export breakdown options"
              >
                  <ExportIcon className="w-4 h-4" />
                  <span>Export</span>
                  <ChevronDownIcon className="w-4 h-4"/>
              </button>
              {isBreakdownExportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10" role="menu" aria-orientation="vertical">
                      <div className="py-1">
                          <ExportMenuItem onClick={onExportBreakdownXLSX} closeMenu={() => setIsBreakdownExportMenuOpen(false)}>
                            <span>Export as Excel (.xlsx)</span>
                          </ExportMenuItem>
                           <ExportMenuItem onClick={onExportBreakdownPDF} closeMenu={() => setIsBreakdownExportMenuOpen(false)}>
                            <span>Export as PDF</span>
                          </ExportMenuItem>
                      </div>
                  </div>
              )}
            </div>
          </div>
        </div>
        
        {isSummaryLoading && (
            <div className="text-center p-4 my-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">Generating insights with Gemini...</p>
            </div>
        )}
        {quickSummary.error && (
             <div className="p-4 my-4 bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/50 rounded-lg text-sm">
                <strong>Error:</strong> {quickSummary.error}
             </div>
        )}
        {quickSummary.text && (
            <div className="p-4 my-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 rounded-r-lg">
                <div className="flex justify-between items-start">
                    <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap flex-1 pr-4">{quickSummary.text}</p>
                    <button 
                      onClick={handleDownloadSummaryPDF}
                      className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      aria-label="Download summary as PDF"
                    >
                      <ExportIcon className="w-3 h-3" />
                      <span>PDF</span>
                    </button>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                    >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip content={CustomTooltip} />
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {summary.debitSummary.sort((a: any,b: any) => b.totalAmount - a.totalAmount).map((item: any) => {
                const isCurrentCategory = categorySummary.category === item.category;
                return (
                <div key={item.category} className="transition-all duration-300">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center space-x-3 flex-1">
                          {/* FIX: Cast style property to string to resolve TypeScript error. */}
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: (categoryColorMap.get(item.category) || '#8884d8') as string }}></span>
                          <p className="font-medium text-gray-700 dark:text-gray-200">{item.category}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-gray-900 dark:text-white">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.totalAmount)}
                        </p>
                        <button
                          onClick={() => handleGetCategorySummary(item.category)}
                          disabled={categorySummary.isLoading && isCurrentCategory}
                          className="p-1.5 rounded-full text-gray-500 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-gray-600 dark:hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-wait"
                          aria-label={`Get summary for ${item.category}`}
                        >
                          <SparkleIcon className="w-4 h-4" />
                        </button>
                      </div>
                  </div>
                  {isCurrentCategory && (
                    <div className="p-3 mt-1 text-sm bg-gray-100 dark:bg-gray-900/50 rounded-b-lg animate-fade-in">
                      {categorySummary.isLoading && <p className="text-gray-500 dark:text-gray-400">Generating insights...</p>}
                      {categorySummary.error && <p className="text-red-600 dark:text-red-400"><strong>Error:</strong> {categorySummary.error}</p>}
                      {categorySummary.text && <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{categorySummary.text}</p>}
                    </div>
                  )}
                </div>
              )})}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;