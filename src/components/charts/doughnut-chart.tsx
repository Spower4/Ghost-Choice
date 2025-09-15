'use client'

import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import SpotlightCard from '@/components/ui/spotlight-card'

ChartJS.register(ArcElement, Tooltip, Legend)

interface DoughnutChartProps {
  data: {
    labels: string[]
    values: number[]
    colors?: string[]
  }
  title: string
  centerText?: {
    value: string
    label: string
  }
  formatValue?: (value: number) => string
  className?: string
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
]

export function DoughnutChart({ 
  data, 
  title, 
  centerText,
  formatValue = (value) => value.toString(),
  className = '' 
}: DoughnutChartProps) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        backgroundColor: data.colors || DEFAULT_COLORS.slice(0, data.labels.length),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 3,
        cutout: '60%',
      },
    ],
  }

  const options = {
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
          color: '#D1D5DB', // Light gray for dark theme
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.label || ''
            const value = context.parsed || 0
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${formatValue(value)} (${percentage}%)`
          },
        },
      },
    },
  }

  return (
    <SpotlightCard className={className} spotlightColor="rgba(59, 130, 246, 0.15)">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="relative h-64">
        <Doughnut data={chartData} options={options} />
        {centerText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{centerText.value}</div>
              <div className="text-sm text-neutral-400">{centerText.label}</div>
            </div>
          </div>
        )}
      </div>
    </SpotlightCard>
  )
}