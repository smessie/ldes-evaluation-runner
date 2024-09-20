# LDES Evaluation Runner

## Setup

First, make sure to install the required dependencies and build the code by running:

```bash
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


## Configuration

Configuring the benchmark is done with the use of `.env` files.
The following variables can be set:

- `TYPE`: The benchmark type. Currently supported: `UPDATING_LDES`.
- `EXEC_FILE`: The file to execute. This is the file that will be benchmarked.
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

Preconfigured `.env` files can be found in the `env` directory.


## Running the benchmark

To run the benchmark, execute the following command:

```bash
node . <env-file> <output-file>
```

`<env-file>` should be the absolute path to the `.env` file you want to use.
