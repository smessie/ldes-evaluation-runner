#!/bin/bash

# Replication of Telraam benchmark
ENV_DIR_TELRAAM_REPLICATION="/users/iesmessa/ldes-evaluation-runner/env/telraam/replication"
OUT_DIR_TELRAAM_REPLICATION="/users/iesmessa/ldes-evaluation-runner/out/telraam/replication"

for env_file in "$ENV_DIR_TELRAAM_REPLICATION"/*.env; do
    base_name=$(basename "$env_file" .env)

    out_file="$OUT_DIR_TELRAAM_REPLICATION/${base_name}.json"

    NODE_OPTIONS=--max-old-space-size=20480 node orchestrator "$env_file" "$out_file" "$SERVER_HOSTNAME"

    docker compose -f orchestrator/docker-compose.yml down
done


# Synchronization of Telraam benchmark
ENV_DIR_TELRAAM_SYNCHRONIZATION="/users/iesmessa/ldes-evaluation-runner/env/telraam/synchronization"
OUT_DIR_TELRAAM_SYNCHRONIZATION="/users/iesmessa/ldes-evaluation-runner/out/telraam/synchronization"

for env_file in "$ENV_DIR_TELRAAM_SYNCHRONIZATION"/*.env; do
    base_name=$(basename "$env_file" .env)

    out_file="$OUT_DIR_TELRAAM_SYNCHRONIZATION/${base_name}.json"

    NODE_OPTIONS=--max-old-space-size=20480 node orchestrator "$env_file" "$out_file" "$SERVER_HOSTNAME"

    docker compose -f orchestrator/docker-compose.yml down
done


# Replication of Marine Regions benchmark
ENV_DIR_MARINE_REGIONS_REPLICATION="/users/iesmessa/ldes-evaluation-runner/env/marine-regions/replication"
OUT_DIR_MARINE_REGIONS_REPLICATION="/users/iesmessa/ldes-evaluation-runner/out/marine-regions/replication"

for env_file in "$ENV_DIR_MARINE_REGIONS_REPLICATION"/*.env; do
    base_name=$(basename "$env_file" .env)

    out_file="$OUT_DIR_MARINE_REGIONS_REPLICATION/${base_name}.json"

    NODE_OPTIONS=--max-old-space-size=20480 node orchestrator "$env_file" "$out_file" "$SERVER_HOSTNAME"

    docker compose -f orchestrator/docker-compose.yml down
done
