# Ghost Setup Finder

AI-powered product discovery with a friendly ghost guide. Find complete product setups or individual items with intelligent recommendations powered by Gemini AI and comprehensive product search.

## Features

- 🔍 **Smart Search**: Find complete setups or individual products
- 🤖 **AI-Powered**: Gemini AI for planning, ranking, and recommendations
- 👻 **Ghost Guide**: Friendly mascot with helpful tips and animations
- 💰 **Budget Management**: Intelligent budget distribution across categories
- 🌍 **Multi-Region**: Support for US, UK, EU, India, Canada, and Australia
- 📊 **Visual Analytics**: Budget charts and statistics
- 🎨 **AI Scene Generation**: Visualize products in realistic settings
- 🔗 **Easy Sharing**: Share setups with short links
- 🌐 **Chrome Extension**: Browser integration for seamless shopping

## Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS
- **State Management**: TanStack Query
- **Animations**: Rive
- **AI**: Gemini 2.5 Pro, Gemini Image API
- **Search**: SerpAPI
- **Database**: Upstash Redis
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for:
  - Gemini AI
  - SerpAPI
  - Upstash Redis

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Fill in your API keys in `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   SERPAPI_KEY=your_serpapi_key_here
   UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   └── globals.css     # Global styles
├── components/         # React components
│   ├── ui/            # UI components
│   ├── charts/        # Chart components
│   ├── ghost/         # Ghost mascot components
│   ├── product/       # Product-related components
│   └── providers/     # Context providers
├── hooks/             # Custom React hooks
├── lib/               # Utilities and configurations
└── types/             # TypeScript type definitions
```

## API Endpoints

- `POST /api/build` - Main orchestrator for product discovery
- `POST /api/plan` - AI-powered setup planning
- `POST /api/search` - Product search via SerpAPI
- `POST /api/rank` - AI-powered product ranking
- `POST /api/ai-scene` - Generate AI scenes with products
- `POST /api/share` - Create shareable setup links
- `GET /api/share` - Retrieve shared setups

## Development

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Build for production
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
