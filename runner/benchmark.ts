import type { ChildProcess } from "node:child_process";
import { fork } from "node:child_process";
import pidusage from "pidusage";
import { cleanup } from "./setup";
import { v2 as compose } from "@smessie/docker-compose";

export async function runBenchmarkIteration(
    file: string,
    config: any,
    numClients: number = 1,
): Promise<BenchmarkResult> {
    // Start the child process executing the code we want to benchmark
    let args: string[] = [];
    if (config.type === "UPDATING_LDES" || config.type === "STATIC_LDES") {
        args = [config.expectedCount.toString(), config.pollInterval.toString()];
    }

    const children: {
        child: ChildProcess;
        promise: Promise<{
            resultMembersCount: number;
            resultQuadsCount: number;
        }>;
    }[] = [];

    for (let i = 0; i < numClients; i++) {
        const child = fork(file, args);

        // Stop the child process when the parent process exits
        stopChildProcessOnExit(child);

        const promise: Promise<{
            resultMembersCount: number;
            resultQuadsCount: number;
        }> = new Promise((resolve, reject) => {
            let resultMembersCount = 0;
            let resultQuadsCount = 0;
            child.on("message", (message) => {
                if (typeof message === "object" && "resultMembers" in message) {
                    resultMembersCount = message.resultMembers as number;
                }
                if (typeof message === "object" && "resultQuads" in message) {
                    resultQuadsCount = message.resultQuads as number;
                }
            });

            child.on("close", () => {
                resolve({ resultMembersCount, resultQuadsCount });
            });
            child.on("error", reject);
            if (i === 0) {
                child.stdout?.on("data", console.log);
            }
        });

        children.push({ child, promise });
    }

    // Start collecting metrics
    const metrics = collectMetrics(children.map(c => c.child), 1000);

    // Wait for the child processes to finish
    const results = await Promise.all(children.map((c) => c.promise));
    const avgMembersCount = results.reduce((acc, val) => acc + val.resultMembersCount, 0) / results.length;
    const avgQuadsCount = results.reduce((acc, val) => acc + val.resultQuadsCount, 0) / results.length;

    const metricsResult = metrics();

    const clientLoad: Load = statsToLoad(metricsResult.clientStats);
    const serverLoad: Load = statsToLoad(metricsResult.serverStats);
    const proxyLoad: Load = statsToLoad(metricsResult.proxyStats);

    if (config.type === "UPDATING_LDES" || config.type === "STATIC_LDES") {
        return new BenchmarkResult(
            metricsResult.time,
            clientLoad,
            serverLoad,
            proxyLoad,
            metricsResult.clientStats,
            metricsResult.serverStats,
            metricsResult.proxyStats,
            avgMembersCount,
            avgMembersCount / metricsResult.time,
            avgQuadsCount,
            avgQuadsCount / metricsResult.time,
            config.pollInterval,
        );
    } else {
        return new BenchmarkResult(
            metricsResult.time,
            clientLoad,
            serverLoad,
            proxyLoad,
            metricsResult.clientStats,
            metricsResult.serverStats,
            metricsResult.proxyStats,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
        );
    }
}

function collectMetrics(children: ChildProcess[], intervalMs: number = 100): () => Metrics {
    for (const child of children) {
        if (!child.pid) {
            throw new Error("Child process does not have a PID");
        }
    }

    // Collect cpu and memory metrics every intervalMs milliseconds
    const clientStats: { cpu: number; memory: number }[] = [];
    const serverStats: { cpu: number; memory: number; networkInput: number; networkOutput: number }[] = [];
    const proxyStats: { cpu: number; memory: number; networkInput: number; networkOutput: number }[] = [];
    const interval = setInterval(async () => {
        // Add average cpu and memory usage of all clients to the clientStats array
        const cpus = [];
        const memories = [];
        for (const child of children) {
            try {
                const clientStat = await pidusage(child.pid!);
                cpus.push(clientStat.cpu);
                memories.push(clientStat.memory);
            } catch (_) {}
        }
        const avgCpu = cpus.reduce((acc, val) => acc + val, 0) / cpus.length;
        const avgMemory = memories.reduce((acc, val) => acc + val, 0) / memories.length;
        clientStats.push({ cpu: avgCpu, memory: avgMemory });

        const serverStat: compose.DockerComposeStatsResult = await compose.stats("ldes-server");
        serverStats.push({
            cpu: parseFloat(serverStat.CPUPerc.replace("%", "")),
            memory: readableFormatToBytes(serverStat.MemUsage.split("/")[0].trim()),
            networkInput: readableFormatToBytes(serverStat.NetIO.split("/")[0].trim()),
            networkOutput: readableFormatToBytes(serverStat.NetIO.split("/")[1].trim()),
        });

        const proxyStat: compose.DockerComposeStatsResult = await compose.stats("nginx");
        proxyStats.push({
            cpu: parseFloat(proxyStat.CPUPerc.replace("%", "")),
            memory: readableFormatToBytes(proxyStat.MemUsage.split("/")[0].trim()),
            networkInput: readableFormatToBytes(proxyStat.NetIO.split("/")[0].trim()),
            networkOutput: readableFormatToBytes(proxyStat.NetIO.split("/")[1].trim()),
        });
    }, intervalMs);

    // Start a timer to measure the total time
    const hrStart = process.hrtime();

    // Return a function that stops the metric collector interval and returns the metrics
    return () => {
        const hrEnd = process.hrtime(hrStart);
        clearInterval(interval);
        return {
            time: hrEnd[0] + hrEnd[1] / 1_000_000_000,
            clientStats: clientStats,
            serverStats: serverStats,
            proxyStats: proxyStats,
        };
    };
}

function stopChildProcessOnExit(child: ChildProcess): void {
    let terminated = false;
    child.on("exit", () => {
        terminated = true;
    });
    const callOnExit = async (code: any) => {
        if (!child.killed && !terminated) {
            child.kill();
        }

        console.log(`Exiting because of ${code}. Cleaning up...`);
        await cleanup();
    };
    process.on("exit", callOnExit);
    process.on("SIGINT", callOnExit);
    process.on("SIGQUIT", callOnExit);
    process.on("uncaughtException", callOnExit);
}

function readableFormatToBytes(value: string): number {
    const match = value.match(/^([0-9.]+(e[+-][0-9]+)?)([A-z]+)$/);
    if (!match) {
        throw new Error(`Invalid value: ${value}`);
    }

    const number = parseFloat(match[1]);
    switch (match[3]) {
        case "B":
            return number;
        case "KiB":
            return number * 1024;
        case "MiB":
            return number * 1024 * 1024;
        case "GiB":
            return number * 1024 * 1024 * 1024;
        case "TiB":
            return number * 1024 * 1024 * 1024 * 1024;
        case "KB":
            return number * 1000;
        case "MB":
            return number * 1000 * 1000;
        case "GB":
            return number * 1000 * 1000 * 1000;
        case "TB":
            return number * 1000 * 1000 * 1000 * 1000;
        default:
            throw new Error(`Invalid unit: ${match[3]}`);
    }
}

function statsToLoad(stats: { cpu: number; memory: number; networkInput?: number; networkOutput?: number }[]): Load {
    const avgCpu = stats.reduce((acc, val) => acc + val.cpu, 0) / stats.length;
    const avgMemory = stats.reduce((acc, val) => acc + val.memory, 0) / stats.length;
    const maxCpu = stats.reduce((acc, val) => Math.max(acc, val.cpu), 0);
    const maxMemory = stats.reduce((acc, val) => Math.max(acc, val.memory), 0);
    const meanCpu = mean(stats.map((stat) => stat.cpu));
    const meanMemory = mean(stats.map((stat) => stat.memory));
    const networkInput = (stats[stats.length - 1].networkInput || 0) - (stats[0].networkInput || 0);
    const networkOutput = (stats[stats.length - 1].networkOutput || 0) - (stats[0].networkOutput || 0);
    return {
        avgCpu,
        avgMemory,
        maxCpu,
        maxMemory,
        meanCpu,
        meanMemory,
        networkInput: networkInput,
        networkOutput: networkOutput,
    };
}

function mean(values: number[]): number {
    // If no elements, return 0
    if (values.length === 0) {
        return 0;
    }
    // Sort the values
    values = [...values].sort((a, b) => a - b);
    // If odd number of elements, return the middle element
    if (values.length % 2 === 1) {
        return values[Math.floor(values.length / 2)];
    }
    // If even number of elements, return the average of the two middle elements
    return (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
}

export class BenchmarkResult {
    public readonly time: number; // in seconds
    public readonly clientLoad: Load;
    public readonly serverLoad: Load;
    public readonly proxyLoad: Load;
    public readonly clientStats?: { cpu: number; memory: number }[];
    public readonly serverStats?: { cpu: number; memory: number; networkInput: number; networkOutput: number }[];
    public readonly proxyStats?: { cpu: number; memory: number; networkInput: number; networkOutput: number }[];
    public readonly membersCount?: number;
    public readonly membersThroughput?: number;
    public readonly quadsCount?: number;
    public readonly quadsThroughput?: number;
    public readonly pollInterval?: number;

    constructor(
        time: number,
        clientLoad: Load,
        serverLoad: Load,
        proxyLoad: Load,
        clientStats: {
            cpu: number;
            memory: number;
        }[],
        serverStats: {
            cpu: number;
            memory: number;
            networkInput: number;
            networkOutput: number;
        }[],
        proxyStats: {
            cpu: number;
            memory: number;
            networkInput: number;
            networkOutput: number;
        }[],
        membersCount?: number,
        membersThroughput?: number,
        quadsCount?: number,
        quadsThroughput?: number,
        pollInterval?: number,
    ) {
        this.time = time;
        this.clientLoad = clientLoad;
        this.serverLoad = serverLoad;
        this.proxyLoad = proxyLoad;
        this.clientStats = clientStats;
        this.serverStats = serverStats;
        this.proxyStats = proxyStats;
        this.membersCount = membersCount;
        this.membersThroughput = membersThroughput;
        this.quadsCount = quadsCount;
        this.quadsThroughput = quadsThroughput;
        this.pollInterval = pollInterval;
    }
}

type Metrics = {
    time: number;
    clientStats: { cpu: number; memory: number }[];
    serverStats: { cpu: number; memory: number; networkInput: number; networkOutput: number }[];
    proxyStats: { cpu: number; memory: number; networkInput: number; networkOutput: number }[];
};

export type Load = {
    avgCpu: number;
    avgMemory: number;
    maxCpu: number;
    maxMemory: number;
    meanCpu: number;
    meanMemory: number;
    networkInput?: number;
    networkOutput?: number;
};
