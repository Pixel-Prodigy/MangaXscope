# 🚀 MangaHook - Complete Setup Guide

This guide will help you set up both the backend server and frontend application.

## 📋 Prerequisites

- **Node.js** 18+ installed
- **pnpm** (recommended) or **npm**
- A code editor (VS Code recommended)

## 🏗️ Project Structure

```
mangahook-api/
├── server/          # Backend Express API (Port 3000)
└── next-app/        # Frontend Next.js App (Port 3001)
```

## 🔧 Backend Setup (Server)

### Step 1: Navigate to Server Directory

```bash
cd server
```

### Step 2: Install Dependencies

```bash
npm install
# or if using pnpm
pnpm install
```

### Step 3: Create Environment File

Create a `.env` file in the `server` directory:

```bash
touch .env
```

Add the following to `.env`:

```env
PORT=3000
API_KEY=your-api-key-here
```

> **Note**: The API_KEY is used for middleware authentication. You can set any value or check `server/middleware/apiKeyMiddleware.js` for requirements.

### Step 4: Start the Backend Server

```bash
npm start
# or
pnpm start
```

The server will start on **http://localhost:3000**

You should see:
```
Server Start On Port 3000 🎉✨
```

## 🎨 Frontend Setup (Next.js)

### Step 1: Navigate to Frontend Directory

Open a **new terminal window** and navigate to:

```bash
cd next-app
```

### Step 2: Install Dependencies

```bash
pnpm install
# or
npm install
```

### Step 3: Create Environment File

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and ensure it points to your backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Step 4: Start the Frontend Server

```bash
pnpm dev
# or
npm run dev
```

The frontend will start on **http://localhost:3001**

> **Note**: Next.js automatically uses port 3001 when 3000 is occupied.

## ✅ Verify Everything Works

1. **Backend**: Open http://localhost:3000/api/mangaList in your browser
   - You should see JSON data

2. **Frontend**: Open http://localhost:3001 in your browser
   - You should see the MangaHook homepage with manga listings

## 🎯 Quick Start Commands

### Start Both Servers (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd next-app
pnpm dev
```

### Using Concurrently (Optional)

You can run both servers simultaneously. Install concurrently globally:

```bash
npm install -g concurrently
```

Then from the root directory:

```bash
concurrently "cd server && npm start" "cd next-app && pnpm dev"
```

## 📊 Port Summary

| Service | Port | URL |
|---------|------|-----|
| Backend API | 3000 | http://localhost:3000 |
| Frontend App | 3001 | http://localhost:3001 |

## 🔍 Troubleshooting

### Port 3000 Already in Use

If port 3000 is occupied:

**Option 1**: Change backend port in `server/.env`:
```env
PORT=3002
```

Then update `next-app/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

**Option 2**: Kill the process using port 3000:
```bash
# On Linux/Mac
lsof -ti:3000 | xargs kill -9

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Frontend Can't Connect to Backend

1. **Check backend is running**: Visit http://localhost:3000/api/mangaList
2. **Verify environment variable**: Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. **Check CORS**: Ensure backend allows requests from frontend origin
4. **Check API key**: Verify the API key middleware if implemented

### Module Not Found Errors

```bash
# In server directory
rm -rf node_modules package-lock.json
npm install

# In next-app directory
rm -rf node_modules pnpm-lock.yaml .next
pnpm install
```

## 🎨 Features

### Backend API Endpoints

- `GET /api/mangaList` - Get list of mangas with filters
- `GET /api/manga/:id` - Get single manga details
- `GET /api/manga/:id/:ch` - Get chapter images
- `GET /api/search/:query` - Search mangas

### Frontend Features

- 🎨 3 Beautiful Themes (Light, Dark, Manga)
- 🔍 Advanced Search with Debouncing
- 🏷️ Genre Filtering (Include/Exclude)
- 📱 Fully Responsive Design
- ⚡ Fast Loading with Skeletons
- 🎭 Smooth Animations

## 📚 Next Steps

1. Explore the API endpoints in the main README
2. Customize themes in `next-app/app/globals.css`
3. Add more features to the frontend
4. Deploy to production (Vercel for frontend, Railway/Render for backend)

## 🆘 Need Help?

- Check the main [README.md](./README.md) for API documentation
- Review [next-app/README.md](./next-app/README.md) for frontend details
- Check server logs for backend errors
- Check browser console for frontend errors

---

**Happy Coding! 🎉**

