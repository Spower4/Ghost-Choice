'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/use-analytics';
import { Loader2, Package, DollarSign, Star, TrendingUp, ShoppingBag } from 'lucide-react';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const { data, loading, error, refetch } = useAnalytics(timeRange);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate derived metrics
  const totalProducts = data?.popularProducts?.length || 0;
  const totalCost = data?.popularProducts?.reduce((sum: number, product: any) => sum + (product.avgPrice || 0), 0) || 0;
  const avgPrice = totalProducts > 0 ? totalCost / totalProducts : 0;
  const avgRating = 4.2;
  
  // Group products by merchant
  const merchantData = data?.popularProducts?.reduce((acc: any, product: any) => {
    const merchant = product.merchant || 'Unknown';
    if (!acc[merchant]) {
      acc[merchant] = { name: merchant, count: 0 };
    }
    acc[merchant].count++;
    return acc;
  }, {}) || {};

  const merchantList = Object.values(merchantData);

  // Rating distribution
  const ratingDistribution = [
    { rating: '5 Stars', count: 45, percentage: 45 },
    { rating: '4 Stars', count: 30, percentage: 30 },
    { rating: '3 Stars', count: 15, percentage: 15 },
    { rating: '2 Stars', count: 7, percentage: 7 },
    { rating: '1 Star', count: 3, percentage: 3 }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Stats</h1>
            <p className="text-gray-400 mt-1">Track and Analyze Your Product Performance</p>
          </div>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="24h">This Month</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {/* Dashboard Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Products</p>
                  <p className="text-3xl font-bold text-white">{totalProducts}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/20">
                  <Package className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Cost</p>
                  <p className="text-3xl font-bold text-white">${totalCost.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-full bg-green-500/20">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Avg Price</p>
                  <p className="text-3xl font-bold text-white">${avgPrice.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-500/20">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Avg Rating</p>
                  <p className="text-3xl font-bold text-white">{avgRating.toFixed(1)}</p>
                </div>
                <div className="p-3 rounded-full bg-yellow-500/20">
                  <Star className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Products List */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-white">Products List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {data?.popularProducts?.slice(0, 10).map((product: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-400 w-6">{index + 1}.</span>
                      <span className="font-medium text-white truncate">{product.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-green-400">${product.avgPrice?.toFixed(2) || '0.00'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Price Distribution */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-white">Price Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.popularProducts?.slice(0, 6).map((product: any, index: number) => {
                  const maxPrice = Math.max(...(data?.popularProducts?.map((p: any) => p.avgPrice) || [1]));
                  const percentage = (product.avgPrice / maxPrice) * 100;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 truncate">{product.name}</span>
                        <span className="font-medium text-white">${product.avgPrice?.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Rating Distribution */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-white">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ratingDistribution.map((rating, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-sm font-medium text-gray-300 w-16">{rating.rating}</span>
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${rating.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-white ml-3">{rating.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Products by Merchant */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-white">Products by Merchant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {merchantList.slice(0, 8).map((merchant: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-gray-600">
                        <ShoppingBag className="h-4 w-4 text-gray-300" />
                      </div>
                      <span className="font-medium text-white">{merchant.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-400">{merchant.count} items</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Merchant Performance */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-white">Merchant Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {merchantList.slice(0, 6).map((merchant: any, index: number) => (
                <div key={index} className="p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{merchant.name}</h4>
                    <span className="text-sm text-gray-400">{merchant.count} products</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    <p>Performance: <span className="font-medium text-green-400">Good</span></p>
                    <p>Avg Rating: <span className="font-medium text-yellow-400">4.2/5</span></p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}