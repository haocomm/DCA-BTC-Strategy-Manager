# Development Setup Guide

## Current Status (2025-10-28)

✅ **ESLint Configuration**: Fixed and working across all workspaces
✅ **PostCSS/Tailwind CSS**: Properly configured and functional
✅ **Prisma Database**: Generated and connected
✅ **Development Servers**: Both frontend and backend working independently
✅ **Workspace Dependencies**: Properly resolved

## Development Workflow

### Start Development Servers

Currently, the most reliable approach is to start servers separately:

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```
- Runs on port: **3003**
- Database: SQLite (development mode)
- WebSocket: Enabled on same port

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```
- Runs on port: **3001** (3000 occupied)
- Next.js 14.0.0
- Hot reload: Enabled

### Alternative: Individual Server Commands

```bash
# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev
```

## Port Configuration

- **Frontend**: http://localhost:3001 (Next.js)
- **Backend**: http://localhost:3003 (Express API)
- **Database**: SQLite file in `backend/prisma/dev.db`

## Code Quality

### Linting
```bash
# Lint all workspaces
npm run lint

# Lint specific workspace
npm run lint:frontend
npm run lint:backend
```

### Formatting
```bash
# Format frontend code
npx prettier --write frontend/src/

# Format backend code
npx prettier --write backend/src/
```

## ESLint Configuration

- Root: Basic ESLint + Prettier rules
- Frontend: Next.js recommended rules
- Backend: Node.js + ESLint recommended rules

TypeScript ESLint rules have been simplified to avoid configuration conflicts while maintaining code quality.

## Dependencies

Key resolved issues:
- ✅ ESLint version conflicts resolved
- ✅ TypeScript ESLint plugin configuration fixed
- ✅ Prisma client generated successfully
- ✅ Workspace dependencies properly inherited

## Notes

- The `npm run dev` command (concurrently) has some workspace issues - use separate terminals for now
- Frontend automatically falls back to port 3001 if 3000 is occupied
- Both servers have hot reload enabled
- Database schema is ready for development

## Next Steps

1. Consider fixing the concurrently workspace issue for unified dev command
2. Set up proper environment variables for production
3. Configure CI/CD pipeline with the working ESLint setup