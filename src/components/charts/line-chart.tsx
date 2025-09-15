'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface LineChartProps {
  data: {
    labels: string[]
    datasets: {
      label: string
      values: number[]
      color?: string
      fill?: boolean
    }[]
  }
  title: string
  yAxisLabel?: string
  formatValue?: (value: number) => string
  className?: string
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
]

export function LineChart({ 
  data, 
  title, 
  yAxisLabel,
  formatValue = (value) => value.toString(),
  className = '' 
}: LineChartProps) {
  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, index) => ({
      label: dataset.label,
      data: dataset.values,
      borderColor: dataset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      backgroundColor: dataset.fill 
        ? `${dataset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}20`
        : 'transparent',
      fill: dataset.fill || false,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
    })),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${formatValue(context.parsed.y)}`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatValue(value),
        },
        grid: {
          color: '#f3f4f6',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}