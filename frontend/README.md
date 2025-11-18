# Sudic Internal - Frontend

Vite + React + TypeScript frontend for the Sudic Internal Dashboard.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   
   Then fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Environment Variables

Required environment variables (create `.env` file):

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

**Note:** In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client.

## Project Structure

```
src/
  pages/          # Page components
  layouts/        # Layout components
  components/     # Reusable components
    widgets/      # Dashboard widgets
  lib/            # Utilities and helpers
    supabase/     # Supabase client
    types/        # TypeScript types
    utils/        # Utility functions
  App.tsx         # Main app component with routing
  main.tsx        # Entry point
  index.css       # Global styles
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Type check without building

## API Proxy

The Vite dev server proxies `/api/*` requests to `http://localhost:3001` (backend server).

Make sure your backend is running on port 3001, or update the proxy target in `vite.config.ts`.

## Troubleshooting

### "Missing Supabase environment variables" error

1. Create a `.env` file in the `frontend/` directory
2. Add your Supabase credentials (see above)
3. Restart the dev server

### Page doesn't load

- Check browser console for errors
- Verify environment variables are set
- Make sure all dependencies are installed (`npm install`)
- Check that the backend is running if using API routes
