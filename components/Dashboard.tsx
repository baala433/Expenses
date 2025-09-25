
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExpenseSummary, ModalType } from '../types';
import SummaryCard from './SummaryCard';
import { CreditIcon, DebitIcon } from './Icons';

interface DashboardProps {
  summary: ExpenseSummary;
  onCardClick: (type: ModalType) => void;
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

const Dashboard: React.FC<DashboardProps> = ({ summary, onCardClick }) => {
  const chartData = summary.debitSummary.map(item => ({ name: item.category, value: item.totalAmount }));

  return (
    <div className="space-y-8 animate-fade-in">
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
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Expense Breakdown</h3>
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