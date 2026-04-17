FROM node:20-alpine

WORKDIR /app

# Copy root + client package.json files first for caching
COPY package*.json ./
COPY client/package*.json ./client/

# Install ALL deps including dev deps so we can build
RUN npm install

# Copy the rest of your source code
COPY . .

# Build the React client now that client/ exists
RUN npm run build

# Remove devDependencies to keep final image small
RUN npm prune --production

EXPOSE 3000

CMD ["node", "app.js"]
