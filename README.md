
<div align="center">
  <h2>
   Welcome to Manga Hook, your own manga API. </br>
  </h2>
  <p>
  Welcome to Manga Hook, your go-to API for accessing a vast repository of manga data freely. Manga Hook is designed to streamline the process of retrieving manga information, offering features such as search, fetching all manga, fetching a single manga, retrieving manga chapters, and obtaining images from a specific chapter.
  </p>
  <br />

</div>
<h4 align="center">
  <a href="https://mangahook.vercel.app">Demo</a> |
  <a href="https://mangahook-api.vercel.app">Documentation</a>
</h4>

<a href="https://mangahook.vercel.app" target="_blank" rel="noopener">
  <picture>
    <img alt="Manga Hook" src="https://mangahook-api.vercel.app/screenshot/list.png" />
  </picture>
</a>

## Features

- 📚 Get all manga with filtering and pagination
- ℹ️ Get single manga detail with chapter list
- 📖 Get chapter list including images
- 🔍 Advanced search support
- 🎨 Modern Next.js frontend with 3 beautiful themes
- ⚡ Fast performance with React Query and optimizations
- 📱 Fully responsive design
- 🎭 Smooth animations and micro-interactions

## 🚀 Quick Start

### Backend Server Setup

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   ```env
   PORT=3000
   ```

4. **Start the server:**
   ```bash
   npm start
   # or
   pnpm start
   ```
   
   The server will run on **http://localhost:3000**

### Frontend Application Setup

1. **Navigate to the frontend directory (in a new terminal):**
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
   
   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

4. **Start the frontend:**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```
   
   The frontend will run on **http://localhost:3001**

> 📖 **For detailed setup instructions, see [SETUP.md](./SETUP.md)**

Now that Manga Hook is running, let’s explore how to retrieve manga data.

## List Manga

To list available manga, make a GET request to the following endpoint using a tool like Postman or Insomnia:

- **Endpoint:**

    ```http
    GET http://localhost:3000/api/mangaList
    ```

- **Example Response:**

    ```json
    {
        "mangaList": [
            {
                "id": "1manga-oa952283",
                "image": "https://ww6.mangakakalot.tv//mangaimage/manga-oa952283.jpg",
                "title": "Attack On Titan",
                "chapter": "chapter-139",
                "view": "105.8M",
                "description": "..."
                
            }
            // ... other manga entries
        ],
        "metaData": {
            "totalStories": 10,
            "totalPages": 100,
            "type": [
                {
                    "id": "newest",
                    "type": "Newest"
                }
                // ... other types
            ],
            "state": [
                {
                    "id": "Completed",
                    "type": "Completed"
                }
                // ... other states
            ],
            "category": [
                {
                    "id": "all",
                    "type": "ALL"
                }
                // ... 40 other categories
            ]
        }
    }
    ```

Now you're ready to explore and integrate Manga Hook into your projects. Feel free to use the provided API endpoints to access manga data and enhance your manga-related applications!

- **Response Format:**
The API will respond with data structured as follows:

    ```typescript
    interface MangaList {
        mangaList: [
            {
                id: String,
                image: String,
                title: String,
                chapter: String,
                view: String,
                description: String
            }
        ],
        metaData: {
            totalStories: Number,
            totalPages: Number,
            type: [
                {
                    id: String,
                    type: String
                }
            ],
            state: [
                {
                    id: String,
                    type: String
                }
            ],
            category: [
                {
                    id: String,
                    type: String
                }
            ],
        }
    }
    ```
