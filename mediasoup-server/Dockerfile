FROM node:20-alpine

# Install required packages for mediasoup
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose ports
EXPOSE 3031
EXPOSE 40000-49999/udp

# Start the server
CMD ["npm", "run", "dev"] 