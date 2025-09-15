'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import SpotlightCard from '@/components/ui/spotlight-card'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface BarChartProps {
  data: {
    labels: string[]
    values: number[]
    colors?: string[]
  }
  title: string
  yAxisLabel?: string
  formatValue?: (value: number) => string
  horizontal?: boolean
  className?: string
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
]

export function BarChart({ 
  data, 
  title, 
  yAxisLabel,
  formatValue = (value) => value.toString(),
  horizontal = false,
  className = '' 
}: BarChartProps) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: yAxisLabel || title,
        data: data.values,
        backgroundColor: data.colors || DEFAULT_COLORS.slice(0, data.labels.length),
        borderColor: data.colors || DEFAULT_COLORS.slice(0, data.labels.length),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            return `${context.label}: ${formatValue(context.parsed[horizontal ? 'x' : 'y'])}`
          },
        },
      },
    },
    scales: {
      [horizontal ? 'x' : 'y']: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatValue(value),
          color: '#9CA3AF', // Gray for dark theme
        },
        grid: {
          color: '#374151', // Dark gray for grid lines
        },
      },
      [horizontal ? 'y' : 'x']: {
        ticks: {
          color: '#9CA3AF', // Gray for dark theme
        },
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <SpotlightCard className={className} spotlightColor="rgba(59, 130, 246, 0.15)">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </SpotlightCard>
  )
}