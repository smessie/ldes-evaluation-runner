# LDES Evaluation Runner

## Setup

### Retrieve the dataset

First, make sure to install the required dependencies and build the code by running:

```bash
cd setup
npm install
npm run build
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


### Build the runner

After the client has been built, you can build the runner by running:

```bash
cd runner
npm install
npm run build
```


## Configuration

Configuring the benchmark is done with the use of `.env` files.
The following variables can be set:

- `TYPE`: The benchmark type. Currently supported: `UPDATING_LDES`.
- `EXEC_FILE`: The file to execute. This is the file that will be benchmarked.
- `WARMUP_FILE`: The file to execute during the warmup phase.
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
- `REPLICATION_DATA`: The path to the replication data file to use. This is the input to ingest the LDES with.

Preconfigured `.env` files can be found in the `env` directory.


## Running the benchmark

To run the benchmark, execute the following commands:

```bash
# Run as many client runners as you want, optionally on different machines.
node client <name> <server-hostname>

# Run the benchmark runner, this will start the benchmark and use the client runners.
node runner <env-file> <output-file>
```

`<env-file>` should be the absolute path to the `.env` file you want to use.
