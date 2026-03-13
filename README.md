# GoChul Fitness - Modern PWA Fitness Management App

A mobile-first Progressive Web App for managing personal training contracts and sessions. Built with Next.js, TanStack Query, Clerk, and InstantDB with a shadcn/ui + Tailwind UI stack.

## ✨ Key Features

### 🔄 Pull-to-Refresh (NEW!)
- **Mobile**: Native pull-down gesture to refresh all data
- **Desktop**: Manual refresh button in the top bar
- **Complete sync**: Invalidates all queries and refetches data
- See [PULL_TO_REFRESH.md](./PULL_TO_REFRESH.md) for details

### 📱 Progressive Web App
- Install on any device (iOS, Android, Desktop)
- Offline support with service worker
- App-like experience with no browser chrome
- Fast loading with intelligent caching
- See [PWA_SETUP.md](./PWA_SETUP.md) for setup guide

### 💪 Core Features
- **Contract Management**: Create and track PT contracts
- **Session Scheduling**: Book and manage training sessions
- **User Dashboard**: Personalized stats and upcoming sessions
- **Role-Based Access**: Admin, Staff, and Customer roles
- **Real-Time Updates**: Live data synchronization
- See [FEATURES.md](./FEATURES.md) for complete list

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm/bun
- Clerk account (for authentication)
- Instant account (for backend)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd gochul-fitness

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: shadcn/ui (Radix primitives)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Authentication**: Clerk
- **Language**: TypeScript

### Backend
- **API**: Next.js API Routes
- **Database**: Instant (via API)
- **Authentication**: Clerk middleware

### PWA
- **Service Worker**: Custom implementation
- **Manifest**: Web App Manifest
- **Icons**: Multiple sizes for all platforms

## 📁 Project Structure

```
gochul-fitness/
├── src/
│   ├── app/
│   │   ├── (main)/           # Main app routes
│   │   │   ├── page.tsx      # Dashboard
│   │   │   ├── contracts/    # Contracts page
│   │   │   ├── history/      # Sessions page
│   │   │   └── profile/      # Profile page
│   │   ├── api/              # API routes
│   │   ├── globals.css       # Global styles
│   │   └── layout.tsx        # Root layout
│   ├── components/
│   │   ├── cards/            # Card components
│   │   ├── layout/           # Layout components
│   │   ├── modals/           # Modal components
│   │   ├── common/           # Shared components
│   │   ├── PullToRefresh.tsx # Pull-to-refresh
│   │   └── PWAInstaller.tsx  # PWA installer
│   ├── hooks/                # Custom React hooks
│   ├── theme/                # Design tokens/colors
│   └── utils/                # Utility functions
├── public/
│   ├── sw.js                 # Service worker
│   ├── manifest.json         # PWA manifest
│   └── icons/                # App icons
├── FEATURES.md               # Feature documentation
├── PULL_TO_REFRESH.md        # Pull-to-refresh guide
├── PWA_SETUP.md              # PWA setup guide
├── CHANGELOG.md              # Version history
└── README.md                 # This file
```

## 🎨 Design System

### Colors
- **Primary**: `#FA6868` (Coral Red)
- **Secondary**: `#FAAC68` (Orange)
- **Background**: `#f8f9fa` (Light Gray)
- **Text**: `#1f2937` (Dark Gray)

### Components
- Shared design tokens (`src/theme/colors.ts`)
- Tailwind CSS utilities for layouts
- Mobile-first responsive design
- Smooth animations and transitions

## 🔐 Authentication & Authorization

### Roles
- **Admin**: Full system access
- **Staff (Trainer)**: Manage sessions and schedules
- **Customer**: View contracts and book sessions

### Auth Flow
1. User signs in with Clerk
2. Server middleware validates token
3. API routes check user permissions
4. UI adapts based on role

## 📊 Data Management

### React Query
- Infinite scroll pagination
- Optimistic updates
- Automatic caching
- Background refetching
- Pull-to-refresh support

### Query Keys
```typescript
historyKeys.all    // All session data
contractKeys.all   // All contract data
userKeys.all       // All user data
```

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Quality
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript types

# Testing (if configured)
npm run test         # Run tests
npm run test:e2e     # Run E2E tests
```

### Environment Variables

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Instant Database
NEXT_PUBLIC_INSTANTDB_APP_ID=
INSTANTDB_ADMIN_TOKEN=

# Realtime (Ably server-side key)
ABLY_API_KEY=

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📱 PWA Installation

### iOS (Safari)
1. Open app in Safari
2. Tap Share → Add to Home Screen
3. Tap Add

### Android (Chrome)
1. Open app in Chrome
2. Tap Menu → Add to Home Screen
3. Tap Add

### Desktop
1. Click install icon in address bar
2. Click Install

## 🔄 Pull-to-Refresh Usage

### Mobile
1. Scroll to top of any page
2. Pull down with finger
3. Release when icon appears
4. Wait for data refresh

### Desktop
1. Click refresh button (top-right)
2. Wait for spinning icon
3. Data refreshes automatically

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms
- Netlify
- Railway
- Render
- Self-hosted with Docker

## 📈 Performance

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Lighthouse Score**: 90+
- **PWA Score**: 100

## 🐛 Troubleshooting

### Common Issues

**Pull-to-refresh not working**
- Ensure you're at the top of the page
- Check if already refreshing
- Verify scroll container ref is attached

**PWA not installing**
- Use HTTPS connection
- Check manifest.json is accessible
- Verify service worker is registered

**Data not updating**
- Use pull-to-refresh
- Check network connection
- Clear browser cache

## 📚 Documentation

- [Features Overview](./FEATURES.md)
- [Pull-to-Refresh Guide](./PULL_TO_REFRESH.md)
- [PWA Setup](./PWA_SETUP.md)
- [Changelog](./CHANGELOG.md)

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Ant Design for the UI components
- Clerk for authentication
- Instant for the backend
- All contributors and users

---

**Version**: 2.0.0  
**Last Updated**: February 2, 2026  
**Maintained by**: GoChul Fitness Team
