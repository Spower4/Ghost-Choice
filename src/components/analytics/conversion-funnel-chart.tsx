interface ConversionFunnelChartProps {
  data?: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
}

export function ConversionFunnelChart({ data }: ConversionFunnelChartProps) {
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

  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-yellow-500',
    'bg-red-500'
  ];

  const maxCount = Math.max(...data.map(item => item.count));

  return (
    <div className="space-y-4">
      {data.map((stage, index) => {
        const width = (stage.count / maxCount) * 100;
        const dropoffRate = index > 0 ? data[index - 1].percentage - stage.percentage : 0;
        
        return (
          <div key={stage.stage} className="relative">
            {/* Stage bar */}
            <div className="flex items-center space-x-4">
              <div className="w-32 text-sm font-medium text-gray-700 text-right">
                {stage.stage}
              </div>
              
              <div className="flex-1 relative">
                <div className="h-12 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${colors[index % colors.length]} transition-all duration-500 ease-out flex items-center justify-end pr-3`}
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-white text-sm font-medium">
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {/* Percentage label */}
                <div className="absolute -right-16 top-1/2 transform -translate-y-1/2">
                  <span className="text-sm font-medium text-gray-600">
                    {stage.percentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Drop-off indicator */}
            {index > 0 && dropoffRate > 0 && (
              <div className="flex items-center justify-center mt-2 mb-2">
                <div className="flex items-center space-x-2 text-xs text-red-600">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-400"></div>
                  <span>{dropoffRate.toFixed(1)}% drop-off</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary stats */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {data[0]?.count.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-600">Total Entries</p>
          </div>
          
          <div>
            <p className="text-2xl font-bold text-green-600">
              {data[data.length - 1]?.count.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-600">Conversions</p>
          </div>
          
          <div>
            <p className="text-2xl font-bold text-red-600">
              {data[data.length - 1]?.percentage.toFixed(1) || 0}%
            </p>
            <p className="text-sm text-gray-600">Conversion Rate</p>
          </div>
          
          <div>
            <p className="text-2xl font-bold text-yellow-600">
              {((data[0]?.count || 0) - (data[data.length - 1]?.count || 0)).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Drop-offs</p>
          </div>
        </div>
      </div>
    </div>
  );
}