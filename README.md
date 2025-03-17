# LDES Evaluation Runner

## Usage

This repository holds the implementations of the client and orchestrator for the LDES benchmarks.
The client is used to execute a benchmark scenario, collect the metrics and results, and send them to the orchestrator.
The orchestrator is used to start the benchmark, initialize the clients and extra services like the database and LDES server, collect the metrics of the extra services and the results of the clients, and store them in a file.
This repository also holds a visualizer which can be used to visualize the results.

This evaluation runner will collect the following metrics:
- M1. Useful throughput
- M2. Scalability: the impact of increasing clients on M1, M4 and M5.
- M3. Total bytes transferred (Network I/O of server and proxy)
- M4. Client load (CPU%, MEM)
- M5. Server & proxy load (CPU%, MEM)

### Installation

```bash
# Install the client
npm install ldes-evaluation-runner-client

# Install the orchestrator
npm install ldes-evaluation-runner-orchestrator
```

### Configuration

The configuration of the benchmark is done with the use of `.env` files.
The following variables can be set:

- `TYPE`: The benchmark type. Currently supported: `UPDATING_LDES`.
- `EXEC_FILE`: The file to execute. This is the file that will be benchmarked.
- `WARMUP_FILE`: The file to execute during the warmup phase.
- `CLIENT_ARGUMENTS`: The arguments to pass to the client. Listed as a comma-separated list of environment variable keys that will be loaded. They can then be initialized in this .env file. Use `SERVER_HOSTNAME` to use the server hostname specified when starting the orchestrator. 
- `WARMUP_ROUNDS`: The amount of warmup iterations to run.
- `ITERATIONS`: The amount of iterations to run the benchmark.
- `INGEST_PIPELINE`: The pipeline to use for ingesting the LDES.
- `PAGE_SIZE`: The page size to use for the LDES.
- `K_SPLIT`: In the case of a time-based LDES, the amount of child buckets to split the full bucket into.
- `MIN_BUCKET_SPAN`: In the case of a time-based LDES, the minimum span of a bucket.
- `INTERVAL`: The interval at which the LDES is updated.
- `AMOUNT_PER_INTERVAL`: The amount of members to add per interval.
- `EXPECTED_AMOUNT`: In the case of `UPDATING_LDES`. The expected amount of members in the LDES after the benchmark.
  Used to end the benchmark.
- `POLL_INTERVAL`: In the case of `UPDATING_LDES`. The poll interval used by the ldes-client during the benchmark.
- `NGINX_CONFIG`: The path to the nginx configuration file to use.
- `NGINX_SITE`: The path to the nginx site configuration file to use.
- `DATABASE_URL`: The URL to the database to use. Supported: `mongodb://...` and `redis://...`.
- `NUM_CLIENTS`: The number of clients that should simultaneously run during the benchmark.
- `REPLICATION_DATA`: The path on the host to the replication data file to use. This is the input to ingest the LDES with.
- `METADATA_FILE`: The path on the container to the metadata file to use. This is the metadata input to ingest the LDES with.
- `TIMESTAMP_PATH`: The timestamp property in the LDES.
- `UNORDERED_RELATIONS`: In case of an HourBucketizer LDES, whether default `tree:Relation`s should be used or ordered `tree:GreaterThanOrEqualRelation`s.
- `CLIENT_ORDER`: the order with which the ldes clients should be started. `ascending`, `descending` or `none`.
- `LDES_PAGE`: The LDES page to extract the members from in case of the EXTRACT_MEMBERS benchmark type.
- `CBD_SPECIFY_SHAPE`: Whether a shape should be specified for CBD.
- `CBD_DEFAULT_GRAPH`: Whether to use default graph for CBD.

The placeholder `{CWD}` can be used in the configuration files to refer to the current working directory where the orchestrator is started.

An example configuration file can be found at [env/example.env](env/example.env).

The `INGEST_PIPELINE` should be the absolute path to the pipeline file you want to use to ingest data into the LDES.
An example pipeline file can be found at [ingest-server/pipeline.ttl](ingest-server/pipeline.ttl).
The [setup/pipeline-example.ttl](setup/pipeline-example.ttl) can be used to gather input data in the format that the example ingest pipeline expects, using the [replication-processor-ts](https://www.npmjs.com/package/@rdfc/replication-processor-ts).

### Running the benchmark

To run the benchmark, execute the following commands:

```bash
# Run as many client runners as you want, optionally on different machines.
npx ldes-evaluation-runner-client <name> <server-hostname>

# Run the benchmark orchestrator, this will start the benchmark and use the client runners.
npx ldes-evaluation-runner-orchestrator <env-file> <output-file> <server-hostname>
```

`<env-file>` should be the absolute path to the `.env` file you want to use.


### Visualizing the results

To visualize the results, upload the output file in the visualizer and enable the visualizations you want to see.


## Example Repositories

- [ldes-benchmark](https://github.com/smessie/ldes-benchmark): Extensive benchmarking of different LDES configurations, differing in the amount of clients, the amount of data, the LDES fragmentation, ...
- [marine-regions-benchmark](https://github.com/smessie/marine-regions-benchmark): Benchmarking of the Marine Regions LDES, comparing the performance of different LDES fragmentations.
- [ldes-member-extraction-algorithm-impact](https://github.com/smessie/ldes-member-extraction-algorithm-impact): Benchmarking the impact of the member extraction algorithm on the performance of the LDES client.

## Local Development

## Setup

### Retrieve the dataset

First, make sure to install the required dependencies and build the code by running:

```bash
cd setup
npm install
```

Then, you can gather the data by running:

```bash
MAX=100000 npx js-runner setup/pipeline.ttl
# OR
npx js-runner setup/pipeline-6months.ttl
```

With the `MAX` environment variable you can specify the amount of triples to download. The default for `setup/pipeline.ttl` is 100000.
To download the full LDES, set `MAX` to `0`.


### Build the client

After the data has been gathered, you can build the client by running:

```bash
cd client
npm install
npm run build
```


### Build the orchestrator

After the client has been built, you can build the orchestrator by running:

```bash
cd orchestrator
npm install
npm run build
```


### Start the visualizer

First, make sure to install the required dependencies by running:

```bash
cd visualizer
npm install
```

Then, you can start the visualizer by running:

```bash
npm run dev
```
