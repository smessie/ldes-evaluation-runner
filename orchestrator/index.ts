#!/usr/bin/env node

import { awaitMemberCount, awaitOnline, cleanup, ensureCleanup, setup } from "./setup";
import { runBenchmarkIteration } from "./benchmark";
import dotenv from "dotenv";
import jsonfile from "jsonfile";
import { initiateDistribution, startClients, stopDistribution } from "./distributed";
import { accessSync } from "node:fs";

async function main() {
    // Get env file from first argument
    if (process.argv.length < 4) {
        console.error("Usage: node runner <env-file> <output-file> <server-hostname=localhost>");
        process.exit(1);
    }
    const envFile = process.argv[2];
    const outputFile = process.argv[3];
    const serverHostname = process.argv[4] || "127.0.0.1";
    process.env.SERVER_HOSTNAME = serverHostname;

    // Read the env file
    dotenv.config({ path: envFile });

    // Loop over environment parameters and replace `{CWD}` with process.cwc().
    for (const key in process.env) {
        if (process.env[key]) {
            process.env[key] = process.env[key].replace("{CWD}", process.cwd());
        }
    }

    console.log(`[${new Date().toISOString()}] Starting benchmark with env file: ${envFile}`);

    // Get the parameters from the environment
    checkEnvVars(["EXEC_FILE", "ITERATIONS", "TYPE", "COLLECT_METRICS_INTERVAL", "EXPECTED_COUNT", "CLIENT_ARGUMENTS"]);
    const execFile = process.env.EXEC_FILE || "";
    checkFilePath(execFile, "exec file");
    const iterations = parseInt(process.env.ITERATIONS || "");
    const numClients = parseInt(process.env.NUM_CLIENTS || "1");
    const intervalMs = parseInt(process.env.COLLECT_METRICS_INTERVAL || "");
    const expectedCount = parseInt(process.env.EXPECTED_COUNT || "");
    const benchmarkType = process.env.TYPE || "";
    const clientArguments = (process.env.CLIENT_ARGUMENTS || "").split(/\s*,\s*/);
    checkEnvVars(clientArguments);
    const args = clientArguments.map((arg) => process.env[arg] || "");

    checkFilePath(process.env.REPLICATION_DATA, "replication data");
    checkFilePath(process.env.METADATA_FILE, "metadata");
    checkFilePath(process.env.INGEST_PIPELINE, "ingest pipeline");

    await initiateDistribution();

    if (benchmarkType === "STATIC_LDES" || benchmarkType === "EXTRACT_MEMBERS") {
        console.log(`[${new Date().toISOString()}] Starting static LDES benchmark`);

        // Start the required services
        await setup(envFile, serverHostname);

        // Wait for the services to be online
        await awaitOnline(serverHostname);

        // Wait for the LDES to contain the expected number of members
        console.log(`[${new Date().toISOString()}] Waiting for the LDES to contain ${expectedCount} members`);
        await awaitMemberCount(expectedCount, serverHostname);

        // Warmup rounds
        const warmupRounds = parseInt(process.env.WARMUP_ROUNDS || "");
        const warmupFile = process.env.WARMUP_FILE || "";
        if (warmupRounds > 0) {
            for (let i = 0; i < warmupRounds; i++) {
                console.log(`[${new Date().toISOString()}] Running warmup round ${i + 1}/${warmupRounds}`);
                await runBenchmarkIteration(warmupFile, benchmarkType, intervalMs, args);
            }
        }
    }

    ensureCleanup();

    const results = [];
    for (let i = 0; i < iterations; i++) {
        console.log(`[${new Date().toISOString()}] Starting iteration ${i + 1}/${iterations}`);

        let instancesInitialized;
        if (benchmarkType === "UPDATING_LDES") {
            // Start the clients before the ingestion starts
            instancesInitialized = startClients(numClients, execFile, intervalMs, args);

            // Start the required services
            await setup(envFile, serverHostname);

            // Wait for the services to be online
            await awaitOnline(serverHostname);
        }

        // Run the benchmark
        console.log(`[${new Date().toISOString()}] Running benchmark iteration ${i + 1}/${iterations}`);
        const result = await runBenchmarkIteration(execFile, benchmarkType, intervalMs, args, instancesInitialized ?? numClients);
        results.push(result);

        console.log(
            `Iteration ${i + 1}: ${result.membersCount} members in ${result.time}s (throughput: ${result.membersThroughput} members/s), ${result.quadsCount} quads in ${result.time}s (throughput: ${result.quadsThroughput} quads/s), ${result.latency}ms avg latency`,
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

    if (benchmarkType === "STATIC_LDES" || benchmarkType === "EXTRACT_MEMBERS") {
        // Cleanup the services
        await cleanup();
    }

    stopDistribution();

    console.log("\nResults:");
    for (const [i, result] of results.entries()) {
        console.log(
            `${i + 1}, ${result.time}s, ${result.membersCount}, ${result.membersThroughput} members/s, ${result.quadsCount}, ${result.quadsThroughput} members/s, ${result.latency}ms, ${result.clientLoad.avgCpu}%, ${result.clientLoad.avgMemory / 1024 / 1024}MiB, ${result.clientLoad.maxCpu}%, ${result.clientLoad.maxMemory / 1024 / 1024}MiB` +
            (result.serverLoad
                ? `, ${result.serverLoad.avgCpu}%, ${result.serverLoad.avgMemory / 1024 / 1024}MiB, ${result.serverLoad.maxCpu}%, ${result.serverLoad.maxMemory / 1024 / 1024}MiB, ${result.serverLoad.networkInput}MB, ${result.serverLoad.networkOutput}MB`
                : "") +
            (result.proxyLoad
                ? `, ${result.proxyLoad.avgCpu}%, ${result.proxyLoad.avgMemory / 1024 / 1024}MiB, ${result.proxyLoad.maxCpu}%, ${result.proxyLoad.maxMemory / 1024 / 1024}MiB, ${result.proxyLoad.networkInput}MB, ${result.proxyLoad.networkOutput}MB`
                : ""),
        );
    }

    // Write the results to the output file
    console.log(`\n[${new Date().toISOString()}] Writing results to '${outputFile}'...`);

    await jsonfile
        .writeFile(outputFile, results)
        .catch(() => console.error(`[${new Date().toISOString()}] Could not write results to file '${outputFile}'.`));
}

function checkEnvVars(names: string[]) {
    for (const name of names) {
        if (!process.env[name]) {
            console.error(`[${new Date().toISOString()}] Environment variable '${name}' is not set.`);
            process.exit(1);
        }
    }
}

function checkFilePath(filePath: string | undefined, name: string) {
    if (filePath) {
        try {
            accessSync(filePath);
        } catch (e) {
            console.error(`[${new Date().toISOString()}] File '${filePath}' for ${name} does not exist or is not readable.`);
            process.exit(1);
        }
    } else {
        console.warn(`[${new Date().toISOString()}] No ${name} file provided.`);
    }
}

main().catch(console.error);
