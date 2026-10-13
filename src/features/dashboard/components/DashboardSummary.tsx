import { type DashboardSummary as DashboardSummaryData } from '../../../lib/api'

interface DashboardSummaryProps {
  summary?: DashboardSummaryData
  isLoading: boolean
}

export default function DashboardSummary({ summary, isLoading }: DashboardSummaryProps) {
  const cards = [
    { label: 'Total patients', value: summary?.total_patients ?? 0, accent: 'text-blue-600 dark:text-blue-400' },
    { label: 'Completed studies', value: summary?.completed_studies ?? 0, accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Pending review', value: summary?.pending_review ?? 0, accent: 'text-amber-600 dark:text-amber-400' },
  ]

  return (
    <section className="w-full mb-10" aria-labelledby="dashboard-heading">
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Clinical overview</p>
          <h2 id="dashboard-heading" className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Dashboard</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Live data from the clinical API</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.accent}`}>
              {isLoading ? '—' : card.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
