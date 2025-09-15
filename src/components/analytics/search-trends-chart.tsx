import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface SearchTrendsChartProps {
  data?: Array<{
    date: string;
    searches: number;
    uniqueUsers: number;
  }>;
  showVolume?: boolean;
}

export function SearchTrendsChart({ data, showVolume = false }: SearchTrendsChartProps) {
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (dateStr.includes(':')) {
      // Hour format
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: true 
      });
    } else if (dateStr.length === 7) {
      // Month format (YYYY-MM)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    } else {
      // Day format
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (showVolume) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#666"
            fontSize={12}
          />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="searches"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.1}
            strokeWidth={2}
            name="Searches"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatDate}
          stroke="#666"
          fontSize={12}
        />
        <YAxis stroke="#666" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="searches"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          name="Searches"
        />
        <Line
          type="monotone"
          dataKey="uniqueUsers"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
          name="Unique Users"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}