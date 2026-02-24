// components/admin/MultiSelect.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

interface Option {
  id: number | string;
  name: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedIds: (number | string)[];
  onChange: (selectedIds: (number | string)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  maxHeight?: string;
}

export default function MultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  maxHeight = '250px',
}: MultiSelectProps) {
  const [search, setSearch] = useState('');
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredOptions = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return options.filter(opt => opt.name.toLowerCase().includes(lowerSearch));
  }, [options, search]);

  const toggleItem = (id: number | string) => {
    const newSet = new Set(selectedSet);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onChange(Array.from(newSet));
  };

  const selectAll = () => {
    if (filteredOptions.length === 0) return;
    const allFilteredIds = filteredOptions.map(opt => opt.id);
    const newSet = new Set(selectedSet);
    allFilteredIds.forEach(id => newSet.add(id));
    onChange(Array.from(newSet));
  };

  const deselectAll = () => {
    const filteredIds = new Set(filteredOptions.map(opt => opt.id));
    const newSelected = selectedIds.filter(id => !filteredIds.has(id));
    onChange(newSelected);
  };

  return (
    <div className="border rounded-md bg-white">
      <div className="p-2 border-b flex items-center gap-1">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full outline-none text-sm"
        />
      </div>
      {filteredOptions.length > 0 && (
        <div className="flex gap-2 px-2 py-1 border-b text-xs">
          <button type="button" onClick={selectAll} className="text-blue-600 hover:underline">
            Select all
          </button>
          <button type="button" onClick={deselectAll} className="text-blue-600 hover:underline">
            Deselect all
          </button>
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight }}>
        {filteredOptions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">No options found</div>
        ) : (
          filteredOptions.map(option => (
            <label
              key={option.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(option.id)}
                onChange={() => toggleItem(option.id)}
                className="rounded"
              />
              <span className="truncate">{option.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}