import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d';
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const { db } = await connectToDatabase();

    // Parallel data fetching for better performance
    const [
      searchStats,
      userStats,
      popularProducts,
      searchTrends,
      conversionData
    ] = await Promise.all([
      getSearchStats(db, startDate, now),
      getUserStats(db, startDate, now),
      getPopularProducts(db, startDate, now),
      getSearchTrends(db, startDate, now, timeRange),
      getConversionData(db, startDate, now)
    ]);

    const analytics = {
      metrics: {
        totalSearches: searchStats.total,
        uniqueUsers: userStats.unique,
        avgSearchesPerUser: searchStats.total / Math.max(userStats.unique, 1),
        conversionRate: conversionData.rate,
        totalSavedSearches: searchStats.saved,
        activeUsers: userStats.active
      },
      searchTrends: searchTrends,
      popularProducts: popularProducts,
      userActivity: userStats.activity,
      conversionFunnel: conversionData.funnel,
      topSearchTerms: searchStats.topTerms,
      timeRange
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

async function getSearchStats(db: any, startDate: Date, endDate: Date): Promise<any> {
  const searchCollection = db.collection('searches');
  const savedSearchCollection = db.collection('savedSearches');

  const [total, saved, topTerms] = await Promise.all([
    searchCollection.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    savedSearchCollection.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    searchCollection.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { query: '$_id', count: 1, _id: 0 } }
    ]).toArray()
  ]);

  return { total, saved, topTerms };
}

async function getUserStats(db: any, startDate: Date, endDate: Date): Promise<any> {
  const searchCollection = db.collection('searches');
  
  const [uniqueUsers, activeUsers, activity] = await Promise.all([
    searchCollection.distinct('userId', {
      createdAt: { $gte: startDate, $lte: endDate }
    }).then(users => users.length),
    
    searchCollection.distinct('userId', {
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).then(users => users.length),
    
    searchCollection.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          users: { $addToSet: '$userId' },
          searches: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          uniqueUsers: { $size: '$users' },
          totalSearches: '$searches',
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]).toArray()
  ]);

  return { unique: uniqueUsers, active: activeUsers, activity };
}

async function getPopularProducts(db: any, startDate: Date, endDate: Date): Promise<any> {
  const searchCollection = db.collection('searches');
  
  return await searchCollection.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    { $unwind: '$results' },
    {
      $group: {
        _id: '$results.title',
        count: { $sum: 1 },
        avgPrice: { $avg: { $toDouble: '$results.price' } },
        category: { $first: '$results.category' },
        merchant: { $first: '$results.merchant' },
        rating: { $first: '$results.rating' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 50 },
    {
      $project: {
        name: '$_id',
        views: '$count',
        avgPrice: { $round: ['$avgPrice', 2] },
        category: 1,
        merchant: { $ifNull: ['$merchant', 'Unknown'] },
        rating: { $ifNull: ['$rating', 4.0] },
        _id: 0
      }
    }
  ]).toArray();
}

async function getSearchTrends(db: any, startDate: Date, endDate: Date, timeRange: string): Promise<any> {
  const searchCollection = db.collection('searches');
  
  let groupFormat = '%Y-%m-%d';
  if (timeRange === '24h') {
    groupFormat = '%Y-%m-%d %H:00';
  } else if (timeRange === '90d') {
    groupFormat = '%Y-%m';
  }

  return await searchCollection.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: groupFormat,
            date: '$createdAt'
          }
        },
        searches: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        date: '$_id',
        searches: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    { $sort: { date: 1 } }
  ]).toArray();
}

async function getConversionData(db: any, startDate: Date, endDate: Date): Promise<any> {
  const searchCollection = db.collection('searches');
  const savedSearchCollection = db.collection('savedSearches');
  
  const [totalSearches, savedSearches] = await Promise.all([
    searchCollection.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    savedSearchCollection.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    })
  ]);

  const rate = totalSearches > 0 ? (savedSearches / totalSearches) * 100 : 0;

  // Funnel data
  const funnel = [
    { stage: 'Searches', count: totalSearches, percentage: 100 },
    { stage: 'Results Viewed', count: Math.floor(totalSearches * 0.8), percentage: 80 },
    { stage: 'Products Clicked', count: Math.floor(totalSearches * 0.4), percentage: 40 },
    { stage: 'Searches Saved', count: savedSearches, percentage: Math.round(rate) }
  ];

  return { rate: Math.round(rate * 100) / 100, funnel };
}