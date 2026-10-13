import { type ChangeEvent } from 'react';

/**
 * TypeScript Interface:
 * An interface defines the shape of an object. In React, we use it to define the 'props' (properties)
 * that a component expects to receive from its parent component. This ensures type safety at compile
 * time, so if a parent tries to render this component without passing 'totalPatients' (or passes a non-number),
 * TypeScript will throw an error immediately.
 */
interface PatientHeaderProps {
  totalPatients: number;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  modality: string;
  onModalityChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  onResetFilters: () => void;
  userName: string;
  tenantName: string;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function PatientHeader({
  totalPatients,
  searchQuery,
  onSearchQueryChange,
  status,
  onStatusChange,
  modality,
  onModalityChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onResetFilters,
  userName,
  tenantName,
  onLogout,
  isDarkMode,
  onToggleTheme,
}: PatientHeaderProps) {

  return (
    <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-5 sm:p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm gap-5">
      {/* Title & Count Badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Medical Portal
        </h1>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {totalPatients} {totalPatients === 1 ? 'Patient' : 'Patients'}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{tenantName}</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">{userName}</span>
        <button type="button" onClick={onToggleTheme} className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          {isDarkMode ? '☀' : '☾'}
        </button>
        <button type="button" onClick={onLogout} className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          Log out
        </button>
      </div>

      {/* Search Input Box */}
      <div className="relative max-w-sm w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchQueryChange(e.target.value)}
          placeholder="Search patients..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
        <select value={status} onChange={(e) => onStatusChange(e.target.value)} aria-label="Filter by status" style={{ colorScheme: isDarkMode ? 'dark' : 'light' }} className="border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-900 dark:text-slate-100">
          <option value="">All statuses</option><option value="Scheduled">Scheduled</option><option value="In Progress">In progress</option><option value="Pending Review">Pending review</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option>
        </select>
        <select value={modality} onChange={(e) => onModalityChange(e.target.value)} aria-label="Filter by modality" style={{ colorScheme: isDarkMode ? 'dark' : 'light' }} className="border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-900 dark:text-slate-100">
          <option value="">All modalities</option><option value="CT">CT</option><option value="MR">MR</option><option value="XR">XR</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} aria-label="From date" style={{ colorScheme: isDarkMode ? 'dark' : 'light' }} className="border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-900 dark:text-slate-100" />
        <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} aria-label="To date" style={{ colorScheme: isDarkMode ? 'dark' : 'light' }} className="border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-900 dark:text-slate-100" />
        <button type="button" onClick={onResetFilters} className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-200 dark:hover:bg-blue-900/70">Reset filters</button>
      </div>
    </header>
  );
}
