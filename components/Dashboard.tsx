import React, { useState, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExpenseSummary, ModalType } from '../types';
import SummaryCard from './SummaryCard';
import { CreditIcon, DebitIcon, ExportIcon, ChevronDownIcon } from './Icons';

interface DashboardProps {
  summary: ExpenseSummary;
  onCardClick: (type: ModalType) => void;
  onExportXLSX: () => void;
  onExportPDF: () => void;
  onExportBreakdownXLSX: () => void;
  onExportBreakdownPDF: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#19D7FF'];

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

const Dashboard: React.FC<DashboardProps> = ({ summary, onCardClick, onExportXLSX, onExportPDF, onExportBreakdownXLSX, onExportBreakdownPDF }) => {
  const chartData = summary.debitSummary.map(item => ({ name: item.category, value: item.totalAmount }));
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [isBreakdownExportMenuOpen, setIsBreakdownExportMenuOpen] = useState(false);
  const breakdownExportMenuRef = useRef<HTMLDivElement>(null);
  
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

  const ExportMenuItem: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
      <button
        onClick={() => { onClick(); setIsExportMenuOpen(false); }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-3"
        role="menuitem"
      >
        {children}
      </button>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">BBaala Expense Analyser Dashboard</h2>
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
                        <ExportMenuItem onClick={onExportXLSX}><span>Export as Excel (.xlsx)</span></ExportMenuItem>
                        <ExportMenuItem onClick={onExportPDF}><span>Export as PDF</span></ExportMenuItem>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryCard
          title="Total Credit"
          amount={summary.totalCredit}
          icon={<CreditIcon />}
          onClick={() => onCardClick(ModalType.CREDIT)}
          color="green"
        />
        <SummaryCard
          title="Total Debit"
          amount={summary.totalDebit}
          icon={<DebitIcon />}
          onClick={() => onCardClick(ModalType.DEBIT)}
          color="red"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Expense Breakdown</h3>
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
                          <button
                            onClick={() => { onExportBreakdownXLSX(); setIsBreakdownExportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-3"
                            role="menuitem"
                          >
                            <span>Export as Excel (.xlsx)</span>
                          </button>
                           <button
                            onClick={() => { onExportBreakdownPDF(); setIsBreakdownExportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-3"
                            role="menuitem"
                          >
                            <span>Export as PDF</span>
                          </button>
                      </div>
                  </div>
              )}
          </div>
        </div>
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {summary.debitSummary.sort((a,b) => b.totalAmount - a.totalAmount).map((item, index) => (
                <div key={item.category} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center space-x-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <p className="font-medium text-gray-700 dark:text-gray-200">{item.category}</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.totalAmount)}
                    </p>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;