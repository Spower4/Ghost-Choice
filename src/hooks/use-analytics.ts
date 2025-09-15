import { useState, useEffect } from 'react';

interface AnalyticsData {
  metrics: {
    totalSearches: number;
    uniqueUsers: number;
    avgSearchesPerUser: number;
    conversionRate: number;
    totalSavedSearches: number;
    activeUsers: number;
  };
  searchTrends: Array<{
    date: string;
    searches: number;
    uniqueUsers: number;
  }>;
  popularProducts: Array<{
    name: string;
    views: number;
    avgPrice: number;
    category: string;
    merchant: string;
    rating: number;
  }>;
  userActivity: Array<{
    date: string;
    uniqueUsers: number;
    totalSearches: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  topSearchTerms: Array<{
    query: string;
    count: number;
  }>;
  timeRange: string;
}

export function useAnalytics(timeRange: string = '7d') {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics
  };
}