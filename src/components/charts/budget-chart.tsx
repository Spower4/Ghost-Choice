'use client'

import { useState } from 'react'
import { Pie, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { BudgetDistribution } from '@/types'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface BudgetChartProps {
  distribution: BudgetDistribution[]
  totalBudget: number
  currency: string
  chartType?: 'pie' | 'bar'
  className?: string
}

const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
]

export function BudgetChart({ 
  distribution, 
  totalBudget, 
  currency, 
  chartType = 'pie',
  className = '' 
}: BudgetChartProps) {
  const [activeChart, setActiveChart] = useState<'pie' | 'bar'>(chartType)

  const formatCurrency = (amount: number) => {
    const currencySymbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      CAD: 'C$',
      AUD: 'A$'
    } as const

    const symbol = currencySymbols[currency as keyof typeof currencySymbols] || '$'
    return `${symbol}${amount.toLocaleString()}`
  }

  // Prepare chart data
  const chartData = {
    labels: distribution.map(item => item.category),
    datasets: [
      {
        label: 'Budget Allocation',
        data: distribution.map(item => item.amount),
        backgroundColor: distribution.map((item, index) => 
          item.color || CHART_COLORS[index % CHART_COLORS.length]
        ),
        borderColor: distribution.map((item, index) => 
          item.color || CHART_COLORS[index % CHART_COLORS.length]
        ),
        borderWidth: activeChart === 'pie' ? 2 : 1,
        hoverBackgroundColor: distribution.map((item, index) => {
          const color = item.color || CHART_COLORS[index % CHART_COLORS.length]
          return color + '80' // Add transparency for hover
        }),
      },
    ],
  }

  // Chart options
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const item = distribution[context.dataIndex]
            return `${item.category}: ${formatCurrency(item.amount)} (${item.percentage.toFixed(1)}%)`
          },
        },
      },
    },
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const item = distribution[context.dataIndex]
            return `${formatCurrency(item.amount)} (${item.percentage.toFixed(1)}%)`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatCurrency(value),
        },
      },
    },
  }

  if (!distribution || distribution.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No budget data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-card rounded-xl border border-border ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-border gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Budget Distribution</h3>
          <p className="text-sm text-muted-foreground">
            Total Budget: <span className="font-medium">{formatCurrency(totalBudget)}</span>
          </p>
        </div>

        {/* Chart Type Toggle */}
        <div className="flex rounded-lg bg-muted p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveChart('pie')}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              activeChart === 'pie'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pie Chart
          </button>
          <button
            onClick={() => setActiveChart('bar')}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              activeChart === 'bar'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Bar Chart
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-4 sm:p-6">
        <div className="h-64 sm:h-80">
          {activeChart === 'pie' ? (
            <Pie data={chartData} options={pieOptions} />
          ) : (
            <Bar data={chartData} options={barOptions} />
          )}
        </div>
      </div>

      {/* Legend/Details */}
      <div className="border-t border-border p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {distribution.map((item, index) => (
            <div key={item.category} className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                style={{ 
                  backgroundColor: item.color || CHART_COLORS[index % CHART_COLORS.length] 
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                  {item.category}
                </p>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{formatCurrency(item.amount)}</span>
                  <span>•</span>
                  <span>{item.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 sm:mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div>
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                {distribution.length}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Categories</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                {formatCurrency(distribution.reduce((sum, item) => sum + item.amount, 0))}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Allocated</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                {formatCurrency(totalBudget - distribution.reduce((sum, item) => sum + item.amount, 0))}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Remaining</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}