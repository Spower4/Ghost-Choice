import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UserActivityChartProps {
  data?: Array<{
    date: string;
    uniqueUsers: number;
    totalSearches: number;
  }>;
  showEngagement?: boolean;
}

export function UserActivityChart({ data, showEngagement = false }: UserActivityChartProps) {
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

  // Calculate engagement metrics
  const chartData = data.map(item => ({
    ...item,
    searchesPerUser: item.uniqueUsers > 0 ? (item.totalSearches / item.uniqueUsers).toFixed(1) : 0,
    engagementScore: Math.min(100, Math.round((item.totalSearches / Math.max(item.uniqueUsers, 1)) * 20))
  }));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (dateStr.includes(':')) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: true 
      });
    } else if (dateStr.length === 7) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    } else {
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
              {entry.name}: {
                entry.dataKey === 'searchesPerUser' 
                  ? `${entry.value} searches/user`
                  : entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (showEngagement) {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#666"
            fontSize={12}
          />
          <YAxis yAxisId="left" stroke="#666" fontSize={12} />
          <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <Bar
            yAxisId="left"
            dataKey="uniqueUsers"
            fill="#3b82f6"
            fillOpacity={0.7}
            name="Unique Users"
            radius={[2, 2, 0, 0]}
          />
          
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="searchesPerUser"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
            name="Searches per User"
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatDate}
          stroke="#666"
          fontSize={12}
        />
        <YAxis stroke="#666" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        <Bar
          dataKey="uniqueUsers"
          fill="#10b981"
          fillOpacity={0.7}
          name="Unique Users"
          radius={[2, 2, 0, 0]}
        />
        
        <Bar
          dataKey="totalSearches"
          fill="#3b82f6"
          fillOpacity={0.7}
          name="Total Searches"
          radius={[2, 2, 0, 0]}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}