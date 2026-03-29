FROM node:20-alpine

WORKDIR /app

# Copy package files and install all deps (need devDeps for build)
COPY package*.json ./
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

# Remove devDependencies after build
RUN npm prune --omit=dev

# Expose port
EXPOSE 7429

# Mount data volume at /data
VOLUME ["/data"]

# Start Express server
ENV NODE_ENV=production
ENV DATA_PATH=/data
ENV PORT=7429

CMD ["npm", "start"]
