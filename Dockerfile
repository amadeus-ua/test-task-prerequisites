FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source files
COPY . .

# Build TypeScript
RUN yarn build

# Remove development dependencies
RUN yarn install --production --frozen-lockfile

# Expose port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]