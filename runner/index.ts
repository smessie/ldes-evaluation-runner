import { awaitMemberCount, awaitOnline, cleanup, setup } from "./setup";
import { runBenchmarkIteration } from "./benchmark";
import dotenv from "dotenv";
import jsonfile from "jsonfile";

async function main() {
    // Get env file from first argument
    if (process.argv.length < 4) {
        console.error("Usage: node . <env-file> <output-file>");
        process.exit(1);
    }
    const envFile = process.argv[2];
    const outputFile = process.argv[3];

    // Read the env file
    dotenv.config({ path: envFile });

    // Get the parameters from the environment
    checkEnvVars(["EXEC_FILE", "ITERATIONS", "TYPE"]);
    const execFile = process.env.EXEC_FILE || "";
    const iterations = parseInt(process.env.ITERATIONS || "");
    const numClients = parseInt(process.env.NUM_CLIENTS || "1");
    const benchmarkType = process.env.TYPE || "";
    const config: any = { type: benchmarkType };
    if (benchmarkType === "UPDATING_LDES" || benchmarkType === "STATIC_LDES") {
        checkEnvVars(["EXPECTED_COUNT", "POLL_INTERVAL"]);
        config.expectedCount = parseInt(process.env.EXPECTED_COUNT || "");
        config.pollInterval = parseInt(process.env.POLL_INTERVAL || "");
    }

    if (benchmarkType === "STATIC_LDES") {
        console.log('Starting static LDES benchmark');

        // Start the required services
        await setup(envFile);

        // Wait for the services to be online
        await awaitOnline();

        // Wait for the LDES to contain the expected number of members
        console.log(`Waiting for the LDES to contain ${config.expectedCount} members`);
        await awaitMemberCount(config.expectedCount);

        // Warmup rounds
        const warmupRounds = parseInt(process.env.WARMUP_ROUNDS || "");
        const warmupFile = process.env.WARMUP_FILE || "";
        if (warmupRounds > 0) {
            for (let i = 0; i < warmupRounds; i++) {
                console.log(`Running warmup round ${i + 1}/${warmupRounds}`);
                await runBenchmarkIteration(warmupFile, config);
            }
        }
    }

    const results = [];
    for (let i = 0; i < iterations; i++) {
        console.log(`Starting iteration ${i + 1}/${iterations}`);

        if (benchmarkType === "UPDATING_LDES") {
            // Start the required services
            await setup(envFile);

            // Wait for the services to be online
            await awaitOnline();
        }

        // Run the benchmark
        console.log(`Running benchmark iteration ${i + 1}/${iterations}`);
        const result = await runBenchmarkIteration(execFile, config, numClients);
        results.push(result);

        console.log(
            `Iteration ${i + 1}: ${result.membersCount} members in ${result.time}s (throughput: ${result.membersThroughput} members/s), ${result.quadsCount} quads in ${result.time}s (throughput: ${result.quadsThroughput} quads/s)`,
        );
        console.log(
            `Client: avg ${result.clientLoad.avgCpu}% CPU and ${result.clientLoad.avgMemory / 1024 / 1024}MiB memory and max ${result.clientLoad.maxCpu}% CPU and ${result.clientLoad.maxMemory / 1024 / 1024}MiB memory`,
        );
        if (result.serverLoad) {
            console.log(
                `Server: avg ${result.serverLoad.avgCpu}% CPU and ${result.serverLoad.avgMemory / 1024 / 1024}MiB memory and max ${result.serverLoad.maxCpu}% CPU and ${result.serverLoad.maxMemory / 1024 / 1024}MiB memory and network input ${result.serverLoad.networkInput}MB and network output ${result.serverLoad.networkOutput}MB`,
            );
        }
        if (result.proxyLoad) {
            console.log(
                `Proxy: avg ${result.proxyLoad.avgCpu}% CPU and ${result.proxyLoad.avgMemory / 1024 / 1024}MiB memory and max ${result.proxyLoad.maxCpu}% CPU and ${result.proxyLoad.maxMemory / 1024 / 1024}MiB memory and network input ${result.proxyLoad.networkInput}MB and network output ${result.proxyLoad.networkOutput}MB`,
            );
        }

        if (benchmarkType === "UPDATING_LDES") {
            // Cleanup the services
            await cleanup();
        }
    }

    if (benchmarkType === "STATIC_LDES") {
        // Cleanup the services
        await cleanup();
    }

    console.log("\nResults:");
    for (const [i, result] of results.entries()) {
        console.log(
            `${i + 1}, ${result.time}s, ${result.membersCount}, ${result.membersThroughput} members/s, ${result.quadsCount}, ${result.quadsThroughput} members/s, ${result.clientLoad.avgCpu}%, ${result.clientLoad.avgMemory / 1024 / 1024}MiB, ${result.clientLoad.maxCpu}%, ${result.clientLoad.maxMemory / 1024 / 1024}MiB` +
                (result.serverLoad
                    ? `, ${result.serverLoad.avgCpu}%, ${result.serverLoad.avgMemory / 1024 / 1024}MiB, ${result.serverLoad.maxCpu}%, ${result.serverLoad.maxMemory / 1024 / 1024}MiB, ${result.serverLoad.networkInput}MB, ${result.serverLoad.networkOutput}MB`
                    : "") +
                (result.proxyLoad
                    ? `, ${result.proxyLoad.avgCpu}%, ${result.proxyLoad.avgMemory / 1024 / 1024}MiB, ${result.proxyLoad.maxCpu}%, ${result.proxyLoad.maxMemory / 1024 / 1024}MiB, ${result.proxyLoad.networkInput}MB, ${result.proxyLoad.networkOutput}MB`
                    : ""),
        );
    }

    // Write the results to the output file
    console.log(`\nWriting results to '${outputFile}'...`);

    await jsonfile
        .writeFile(outputFile, results)
        .catch(() => console.error(`Could not write results to file '${outputFile}'.`));
}

function checkEnvVars(names: string[]) {
    for (const name of names) {
        if (!process.env[name]) {
            console.error(`Environment variable '${name}' is not set.`);
            process.exit(1);
        }
    }
}

main().catch(console.error);