# Start from a Node container
FROM node:lts-alpine

# Setup working folder
WORKDIR /opt/pipeline
COPY . .

# Install dependencies
RUN npm install

# Container's entrypoint command
ENTRYPOINT [ "npx", "js-runner", "pipeline.ttl" ]
