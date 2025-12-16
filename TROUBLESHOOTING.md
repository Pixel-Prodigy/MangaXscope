# 🔧 Troubleshooting Guide

## Manga Not Showing Issues

### 1. Check Server is Running

**Backend must be running first!**

```bash
cd server
npm start
```

You should see:
```
Server Start On Port 3000 🎉✨
```

### 2. Check Environment Variables

**Frontend `.env.local` file:**
```bash
cd next-app
cat .env.local
```

Should contain:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Backend `.env` file:**
```bash
cd server
cat .env
```

Should contain:
```
PORT=3000
```

### 3. Check CORS Configuration

The server should have CORS enabled. Check `server/app.js`:

```javascript
const cors = require("cors")
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}))
```

### 4. Test API Directly

Open in browser: **http://localhost:3000/api/mangaList**

You should see JSON data. If not, the server has an issue.

### 5. Check Browser Console

Open browser DevTools (F12) and check:
- **Console tab**: Look for errors
- **Network tab**: Check if API requests are being made
  - Look for requests to `http://localhost:3000/api/mangaList`
  - Check if they're failing (red) or successful (green)

### 6. Common Issues

**Issue: "Failed to fetch" or CORS error**
- **Solution**: Restart the backend server after adding CORS
- Make sure CORS is installed: `cd server && npm install cors`

**Issue: "API Error: 404"**
- **Solution**: Check the API endpoint URL in browser console
- Verify server routes are correct

**Issue: "Cannot connect to API"**
- **Solution**: 
  1. Verify backend is running on port 3000
  2. Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
  3. Restart frontend after creating `.env.local`

**Issue: Port already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### 7. Restart Everything

If nothing works, restart both servers:

**Terminal 1 - Backend:**
```bash
cd server
# Stop server (Ctrl+C)
npm start
```

**Terminal 2 - Frontend:**
```bash
cd next-app
# Stop server (Ctrl+C)
pnpm dev
```

### 8. Check Network Requests

In browser DevTools → Network tab:
1. Filter by "Fetch/XHR"
2. Look for requests to `/api/mangaList`
3. Click on the request
4. Check:
   - **Status**: Should be 200 (green)
   - **Response**: Should show JSON data
   - **Headers**: Check if CORS headers are present

### 9. Verify Installation

**Backend dependencies:**
```bash
cd server
npm list cors
```

Should show cors package. If not:
```bash
npm install cors
```

**Frontend dependencies:**
```bash
cd next-app
pnpm list @tanstack/react-query
```

### 10. Clear Cache

**Frontend:**
```bash
cd next-app
rm -rf .next
pnpm dev
```

**Browser:**
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear browser cache

## Still Not Working?

1. Check server logs for errors
2. Check browser console for JavaScript errors
3. Verify both servers are running on correct ports
4. Test API endpoint directly in browser
5. Check network tab for failed requests

---

**Quick Test:**

1. Open http://localhost:3000/api/mangaList → Should show JSON
2. Open http://localhost:3001 → Should show manga list
3. Check browser console → Should have no errors

