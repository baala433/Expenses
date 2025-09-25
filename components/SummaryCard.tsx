
import React from 'react';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  onClick: () => void;
  color: 'green' | 'red';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, icon, onClick, color }) => {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600 text-green-100',
    red: 'from-red-500 to-rose-600 text-red-100',
  };

  return (
    <div
      onClick={onClick}
      className={`relative p-6 rounded-xl shadow-lg cursor-pointer bg-gradient-to-br ${colorClasses[color]} overflow-hidden group transition-all duration-300 hover:scale-105 transform`}
    >
      <div className="absolute -top-4 -right-4 text-white/10 text-8xl group-hover:scale-125 transition-transform duration-500">
        {icon}
      </div>
      <div className="relative z-10">
        <h3 className="text-lg font-semibold text-white/90">{title}</h3>
        <p className="text-4xl font-bold text-white mt-2">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)}
        </p>
        <p className="text-sm text-white/70 mt-4">Click to view details</p>
      </div>
    </div>
  );
};

export default SummaryCard;