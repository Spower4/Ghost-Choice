import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PopularProductsChartProps {
  data?: Array<{
    name: string;
    views: number;
    avgPrice: number;
    category: string;
  }>;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export function PopularProductsChart({ data }: PopularProductsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-pulse bg-gray-200 h-4 w-32 mx-auto mb-2 rounded"></div>
          <div className="animate-pulse bg-gray-200 h-4 w-24 mx-auto rounded"></div>
        </div>
      </div>
    );
  }

  // Take top 10 products for better visualization
  const chartData = data.slice(0, 10).map((item, index) => ({
    ...item,
    shortName: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    color: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-gray-900 mb-2">{data.name}</p>
          <p className="text-sm text-blue-600">Views: {data.views.toLocaleString()}</p>
          <p className="text-sm text-green-600">Avg Price: ${data.avgPrice}</p>
          <p className="text-sm text-gray-600">Category: {data.category}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="shortName" 
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="#666"
            fontSize={11}
          />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="views" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Category breakdown */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Top Categories</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from(new Set(data.map(item => item.category)))
            .slice(0, 6)
            .map((category, index) => {
              const categoryViews = data
                .filter(item => item.category === category)
                .reduce((sum, item) => sum + item.views, 0);
              
              return (
                <div key={category} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {category}
                    </p>
                    <p className="text-xs text-gray-500">
                      {categoryViews.toLocaleString()} views
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}