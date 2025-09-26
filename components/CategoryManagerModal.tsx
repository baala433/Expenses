import React, { useState } from 'react';
import { EditIcon, TrashIcon, categoryIcons } from './Icons';

const IconPicker = ({ selectedIcon, onSelect }: { selectedIcon: string, onSelect: (iconName: string) => void }) => {
    return (
        <div className="grid grid-cols-8 gap-2 my-2">
            {Object.entries(categoryIcons).map(([key, IconComponent]) => (
                <button
                    type="button"
                    key={key}
                    onClick={() => onSelect(key)}
                    className={`p-2 rounded-lg flex justify-center items-center transition-all ${selectedIcon === key ? 'bg-blue-500 text-white ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-blue-200 dark:hover:bg-blue-500'}`}
                >
                    <IconComponent className="w-5 h-5" />
                </button>
            ))}
        </div>
    );
};


const CategoryManagerModal = ({ isOpen, onClose, categories, onUpdateCategories, onCategoryNameChange, onCategoryDelete }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#563d7c');
  const [newCategoryIcon, setNewCategoryIcon] = useState('other');
  const [editedName, setEditedName] = useState('');
  const [editedColor, setEditedColor] = useState('');
  const [editedIcon, setEditedIcon] = useState('');

  if (!isOpen) return null;

  const handleAddCategory = (e) => {
    e.preventDefault();
    const trimmedName = newCategoryName.trim();
    if (trimmedName && !categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      const newCategories = [...categories, { name: trimmedName, color: newCategoryColor, icon: newCategoryIcon }];
      onUpdateCategories(newCategories);
      setNewCategoryName('');
      setNewCategoryColor('#563d7c');
      setNewCategoryIcon('other');
    }
  };

  const startEditing = (index, category) => {
    setEditingIndex(index);
    setEditedName(category.name);
    setEditedColor(category.color);
    setEditedIcon(category.icon || 'other');
  };
  
  const handleUpdateCategory = (index) => {
      const originalCategory = categories[index];
      const trimmedName = editedName.trim();
      
      if (trimmedName && (trimmedName !== originalCategory.name || editedColor !== originalCategory.color || editedIcon !== originalCategory.icon)) {
          // Check for name conflict
          if (trimmedName.toLowerCase() !== originalCategory.name.toLowerCase() && categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
              alert("A category with this name already exists.");
              return;
          }
          
          const newCategories = [...categories];
          newCategories[index] = { name: trimmedName, color: editedColor, icon: editedIcon };
          onUpdateCategories(newCategories);
          
          if(trimmedName !== originalCategory.name) {
              onCategoryNameChange(originalCategory.name, trimmedName);
          }
      }
      setEditingIndex(null);
  };

  const handleDeleteCategory = (index) => {
      const categoryToDelete = categories[index];
      if (window.confirm(`Are you sure you want to delete the "${categoryToDelete.name}" category? All associated transactions will be moved to "Other".`)) {
          const newCategories = categories.filter((_, i) => i !== index);
          onUpdateCategories(newCategories);
          onCategoryDelete(categoryToDelete.name);
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col m-4 animate-fade-in-up" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Manage Categories</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
          {categories.map((category, index) => (
            <div key={index} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              {editingIndex === index ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input type="color" value={editedColor} onChange={(e) => setEditedColor(e.target.value)} className="p-0 border-none rounded-md cursor-pointer" style={{height: '2rem', width: '2.5rem', background: 'transparent'}} />
                    <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="form-input flex-grow" autoFocus />
                  </div>
                  <IconPicker selectedIcon={editedIcon} onSelect={setEditedIcon} />
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => setEditingIndex(null)} className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={() => handleUpdateCategory(index)} className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: category.color }}>
                      {(() => {
                          const Icon = categoryIcons[category.icon || 'other'] || categoryIcons.other;
                          return <Icon className="w-5 h-5 text-white" />;
                      })()}
                  </div>
                  <span className="flex-grow font-medium text-gray-800 dark:text-gray-200">{category.name}</span>
                  {category.name !== 'Other' && (
                    <>
                      <button onClick={() => startEditing(index, category)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                        <EditIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteCategory(index)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <footer className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleAddCategory} className="space-y-3">
             <div className="flex items-center space-x-3">
                <input type="color" value={newCategoryColor} onChange={(e) => setNewCategoryColor(e.target.value)} className="p-0 border-none rounded-md cursor-pointer" style={{height: '2.5rem', width: '3rem', background: 'transparent'}}/>
                <input
                 type="text"
                 value={newCategoryName}
                 onChange={(e) => setNewCategoryName(e.target.value)}
                 placeholder="Add new category"
                 className="form-input flex-grow"
                 required
               />
               <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add</button>
             </div>
             <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Icon</label>
                <IconPicker selectedIcon={newCategoryIcon} onSelect={setNewCategoryIcon} />
             </div>
          </form>
        </footer>
      </div>
      <style>{`
        .form-input { @apply bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2; }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 0.375rem; }
      `}</style>
    </div>
  );
};

export default CategoryManagerModal;
