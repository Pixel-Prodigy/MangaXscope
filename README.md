# MangaHook Frontend - Next.js Application

A modern, beautiful manga browsing application built with Next.js 16, TypeScript, Tailwind CSS, and Shadcn UI.

## 🚀 Features

- **Modern UI/UX**: Beautiful, responsive design with 3 themes (Light, Dark, Manga)
- **Advanced Filtering**: Search, sort, and filter by genres with include/exclude options
- **Smooth Animations**: Framer Motion animations and micro-interactions throughout
- **Fast Performance**: Optimized loading states, skeletons, and React Query caching
- **Responsive Design**: Mobile-first approach that works on all devices

## 📋 Prerequisites

- Node.js 18+ or later
- pnpm (recommended) or npm
- Backend server running (see main README)

## 🛠️ Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd next-app
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables:**
   Edit `.env.local` and set your backend API URL:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

## 🎯 Running the Application

### Development Mode

Start the development server:

```bash
pnpm dev
# or
npm run dev
```

The frontend will be available at **http://localhost:3001**

> **Note**: The default Next.js port is 3000, but since your backend uses port 3000, the frontend will automatically use port 3001.

### Production Build

1. **Build the application:**
   ```bash
   pnpm build
   # or
   npm run build
   ```

2. **Start the production server:**
   ```bash
   pnpm start
   # or
   npm start
   ```

## 🎨 Themes

The application includes 3 beautiful themes:

- **Light**: Clean and minimal
- **Dark**: Dark mode with gradient backgrounds
- **Manga**: Custom purple/pink gradient theme (default)

Switch themes using the theme toggle in the navbar.

## 📁 Project Structure

```
next-app/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home page
│   ├── loading.tsx         # Loading page
│   └── manga/
│       └── [id]/
│           └── page.tsx    # Manga detail page
├── components/
│   ├── manga/              # Manga-related components
│   ├── filters/            # Filter components
│   ├── ui/                 # Shadcn UI components
│   ├── navbar.tsx          # Navigation bar
│   └── theme-provider.tsx  # Theme management
├── lib/
│   ├── api/                # API client functions
│   └── utils.ts            # Utility functions
└── public/                 # Static assets
```

## 🔧 Configuration

### Port Configuration

If you need to change the port, you can:

1. **Set a custom port in package.json:**
   ```json
   {
     "scripts": {
       "dev": "next dev -p 3001"
     }
   }
   ```

2. **Or use environment variable:**
   ```bash
   PORT=3001 pnpm dev
   ```

### API URL Configuration

Update `NEXT_PUBLIC_API_URL` in `.env.local` to point to your backend:

```env
# Local development
NEXT_PUBLIC_API_URL=http://localhost:3000

# Production
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

## 🎯 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 🚀 Deployment

The application can be deployed to:

- **Vercel** (recommended for Next.js)
- **Netlify**
- **Any Node.js hosting**

Make sure to set the `NEXT_PUBLIC_API_URL` environment variable in your deployment platform.

## 📝 Notes

- The frontend expects the backend to be running on port 3000 by default
- All API calls are made to the backend server
- The application uses React Query for efficient data fetching and caching
- Theme preferences are saved in localStorage

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

**API connection issues:**
- Ensure the backend server is running
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS is enabled on the backend

**Build errors:**
```bash
# Clear Next.js cache
rm -rf .next
pnpm build
```
