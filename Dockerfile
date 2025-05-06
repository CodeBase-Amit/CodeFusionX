FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY ./client/package*.json ./client/
COPY package*.json ./

# Install dependencies
RUN cd client && npm install
RUN npm install

# Copy source code
COPY . .

# Build the client app
RUN cd client && npm run build

# Expose ports
EXPOSE 5173

# Start the app in development mode
CMD ["npm", "run", "dev:client"] 