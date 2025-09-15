'use client'

import { Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import SpotlightCard from '@/components/ui/spotlight-card'

ChartJS.register(ArcElement, Tooltip, Legend)

// Set global defaults for text color
ChartJS.defaults.color = '#FFFFFF'

interface PieChartProps {
  data: {
    labels: string[]
    values: number[]
    colors?: string[]
  }
  title: string
  formatValue?: (value: number) => string
  className?: string
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
]

export function PieChart({ 
  data, 
  title, 
  formatValue = (value) => value.toString(),
  className = '' 
}: PieChartProps) {
  const total = data.values.reduce((sum, value) => sum + value, 0)
  
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        backgroundColor: data.colors || DEFAULT_COLORS.slice(0, data.labels.length),
        borderColor: '#1F2937',
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBorderColor: '#FFFFFF',
        cutout: '40%', // Creates a donut chart for more modern look
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
      },
    },
    plugins: {
      legend: {
        position: (window.innerWidth < 768 ? 'bottom' : 'right') as const,
        align: 'center' as const,
        labels: {
          padding: window.innerWidth < 768 ? 10 : 15,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: window.innerWidth < 768 ? 11 : 13,
            weight: 'bold' as const,
          },
          color: '#FFFFFF',
          boxWidth: window.innerWidth < 768 ? 10 : 12,
          boxHeight: window.innerWidth < 768 ? 10 : 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#E5E7EB',
        borderColor: '#4B5563',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: (context: any) => {
            const label = context.label || ''
            const value = context.parsed || 0
            const percentage = ((value / total) * 100).toFixed(1)
            return `${formatValue(value)} (${percentage}%)`
          },
        },
      },
    },
    elements: {
      arc: {
        borderRadius: 4,
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
    },
  }

  return (
    <SpotlightCard className={className} spotlightColor="rgba(59, 130, 246, 0.15)">
      <div className="p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">{title}</h3>
        <div className="h-64 sm:h-80 flex items-center justify-center">
          <Pie data={chartData} options={options} />
        </div>
      </div>
    </SpotlightCard>
  )
}