# Start from a Node container
FROM node:lts

# Setup working folder
WORKDIR /opt/pipeline
COPY . .

# Install dependencies
RUN npm install

# Container's entrypoint command
ENTRYPOINT [ "npx", "rdfc", "pipeline.ttl" ]
