# Start from a Node.js ready image
FROM node:lts-alpine

# Set current working directory
WORKDIR /ldes-solid-server

# Copy configuration files
COPY . .

# Install dependencies
RUN npm install

# Open TCP port 3000
EXPOSE 3000

# Set command run by the container
ENTRYPOINT [ "node", "index.js", "-c", "./config-ldes.json" ]
