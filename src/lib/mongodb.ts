// MongoDB connection utility
// For now, this will return mock data until MongoDB is properly configured

interface MockCollection {
  countDocuments: (filter?: any) => Promise<number>;
  distinct: (field: string, filter?: any) => Promise<any[]>;
  aggregate: (pipeline: any[]) => { toArray: () => Promise<any[]> };
}

interface MockDb {
  collection: (name: string) => MockCollection;
}

// Mock data for analytics
const mockSearches = [
  { userId: 'user1', query: 'gaming setup', createdAt: new Date('2024-01-15'), results: [{ title: 'Gaming Chair', price: '299', category: 'Gaming' }] },
  { userId: 'user2', query: 'office desk', createdAt: new Date('2024-01-14'), results: [{ title: 'Standing Desk', price: '599', category: 'Office' }] },
  { userId: 'user1', query: 'mechanical keyboard', createdAt: new Date('2024-01-13'), results: [{ title: 'RGB Keyboard', price: '149', category: 'Gaming' }] },
  { userId: 'user3', query: 'monitor', createdAt: new Date('2024-01-12'), results: [{ title: '4K Monitor', price: '399', category: 'Electronics' }] },
  { userId: 'user2', query: 'laptop stand', createdAt: new Date('2024-01-11'), results: [{ title: 'Adjustable Stand', price: '79', category: 'Office' }] },
];

const mockSavedSearches = [
  { userId: 'user1', searchId: 'search1', createdAt: new Date('2024-01-15') },
  { userId: 'user2', searchId: 'search2', createdAt: new Date('2024-01-14') },
];

function createMockCollection(data: any[]): MockCollection {
  return {
    countDocuments: async (filter = {}) => {
      if (!filter.createdAt) return data.length;
      
      const { $gte, $lte } = filter.createdAt;
      return data.filter(item => {
        const itemDate = new Date(item.createdAt);
        if ($gte && itemDate < $gte) return false;
        if ($lte && itemDate > $lte) return false;
        return true;
      }).length;
    },

    distinct: async (field: string, filter = {}) => {
      let filteredData = data;
      
      if (filter.createdAt) {
        const { $gte, $lte } = filter.createdAt;
        filteredData = data.filter(item => {
          const itemDate = new Date(item.createdAt);
          if ($gte && itemDate < $gte) return false;
          if ($lte && itemDate > $lte) return false;
          return true;
        });
      }
      
      const values = filteredData.map(item => item[field]).filter(Boolean);
      return [...new Set(values)];
    },

    aggregate: (pipeline: any[]) => ({
      toArray: async () => {
        // Simple mock aggregation - return sample data based on pipeline
        const matchStage = pipeline.find(stage => stage.$match);
        let filteredData = data;
        
        if (matchStage) {
          const filter = matchStage.$match;
          if (filter.createdAt) {
            const { $gte, $lte } = filter.createdAt;
            filteredData = data.filter(item => {
              const itemDate = new Date(item.createdAt);
              if ($gte && itemDate < $gte) return false;
              if ($lte && itemDate > $lte) return false;
              return true;
            });
          }
        }

        // Check if it's a grouping operation
        const groupStage = pipeline.find(stage => stage.$group);
        if (groupStage) {
          const groupBy = groupStage.$group._id;
          
          if (typeof groupBy === 'string') {
            // Simple field grouping
            const groups = new Map();
            filteredData.forEach(item => {
              const key = item[groupBy.replace('$', '')];
              if (!groups.has(key)) {
                groups.set(key, { _id: key, count: 0 });
              }
              groups.get(key).count++;
            });
            return Array.from(groups.values()).slice(0, 10);
          } else if (groupBy.$dateToString) {
            // Date grouping for trends
            const groups = new Map();
            filteredData.forEach(item => {
              const date = new Date(item.createdAt);
              const key = date.toISOString().split('T')[0]; // YYYY-MM-DD format
              if (!groups.has(key)) {
                groups.set(key, {
                  date: key,
                  searches: 0,
                  uniqueUsers: new Set()
                });
              }
              const group = groups.get(key);
              group.searches++;
              group.uniqueUsers.add(item.userId);
            });
            
            return Array.from(groups.values()).map(group => ({
              date: group.date,
              searches: group.searches,
              uniqueUsers: group.uniqueUsers.size
            }));
          }
        }

        // Default return for popular products
        if (pipeline.some(stage => stage.$unwind)) {
          return [
            { name: 'Gaming Chair Pro', views: 45, avgPrice: 299, category: 'Gaming' },
            { name: 'Standing Desk Elite', views: 38, avgPrice: 599, category: 'Office' },
            { name: 'RGB Mechanical Keyboard', views: 32, avgPrice: 149, category: 'Gaming' },
            { name: '4K Ultra Monitor', views: 28, avgPrice: 399, category: 'Electronics' },
            { name: 'Adjustable Laptop Stand', views: 24, avgPrice: 79, category: 'Office' }
          ];
        }

        return filteredData.slice(0, 10);
      }
    })
  };
}

export async function connectToDatabase(): Promise<{ db: MockDb }> {
  // Mock database with collections
  const db: MockDb = {
    collection: (name: string) => {
      switch (name) {
        case 'searches':
          return createMockCollection(mockSearches);
        case 'savedSearches':
          return createMockCollection(mockSavedSearches);
        default:
          return createMockCollection([]);
      }
    }
  };

  return { db };
}

// Real MongoDB connection (commented out for now)
/*
import { MongoClient } from 'mongodb';

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(process.env.MONGODB_URI);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  client = new MongoClient(process.env.MONGODB_URI);
  clientPromise = client.connect();
}

export async function connectToDatabase() {
  const client = await clientPromise;
  const db = client.db('ghost-setup-finder');
  return { client, db };
}
*/