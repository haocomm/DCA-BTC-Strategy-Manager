FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build (using our fixed build script)
RUN npm run build

EXPOSE 3001

# Use tsx runtime instead of compiled JavaScript
CMD ["npm", "run", "start"]