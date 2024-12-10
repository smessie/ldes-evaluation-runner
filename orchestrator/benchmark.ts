import * as compose from "docker-compose";
import { getResultsFromClients, startClients } from "./distributed";

export async function runBenchmarkIteration(
    file: string,
    config: any,
    numClients: number = 1,
): Promise<BenchmarkResult> {
    // Start the child process executing the code we want to benchmark
    let args: string[] = [];
    if (config.type === "UPDATING_LDES" || config.type === "STATIC_LDES") {
        args = [config.serverHostname, config.expectedCount.toString(), config.pollInterval.toString(), config.clientOrder, config.clientLastVersionOnly.toString()];
    } else if (config.type === "EXTRACT_MEMBERS") {
        args = [config.ldesPage, config.cbdSpecifyShape.toString(), config.cbdDefaultGraph.toString()];
    }

    // Start collecting server and proxy metrics
    const metrics = collectMetrics(config.intervalMs);

    // Start the clients if not UPDATING_LDES (then the clients are already started)
    let instancesInitialized;
    if (config.type !== "UPDATING_LDES") {
        instancesInitialized = startClients(numClients, file, config.intervalMs, args);
    } else {
        instancesInitialized = numClients;
    }

    // Wait for the clients to finish
    const {
        time,
        clientStats,
        avgMembersCount,
        avgQuadsCount,
        avgLatency,
        avgMemberArrivalTimes,
    } = await getResultsFromClients(instancesInitialized);

    // Get the server and proxy metrics
    const metricsResult = metrics();

    const clientLoad: Load = statsToLoad(clientStats);
    const serverLoad: Load = statsToLoad(metricsResult.serverStats);
    const proxyLoad: Load = statsToLoad(metricsResult.proxyStats);

    if (config.type === "UPDATING_LDES" || config.type === "STATIC_LDES" || config.type === "EXTRACT_MEMBERS") {
        return new BenchmarkResult(
            time,
            clientLoad,
            serverLoad,
            proxyLoad,
            clientStats,
            metricsResult.serverStats,
            metricsResult.proxyStats,
            avgMembersCount,
            avgMembersCount / time,
            avgQuadsCount,
            avgQuadsCount / time,
            avgLatency,
            config.pollInterval,
            avgMemberArrivalTimes
        );
    } else {
        return new BenchmarkResult(
            time,
            clientLoad,
            serverLoad,
            proxyLoad,
            clientStats,
            metricsResult.serverStats,
            metricsResult.proxyStats,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
        );
    }
}

function collectMetrics(intervalMs: number = 100): () => Metrics {
    // Collect cpu and memory metrics every intervalMs milliseconds
    const serverStats: { cpu: number; memory: number; networkInput: number; networkOutput: number }[] = [];
    const proxyStats: { cpu: number; memory: number; networkInput: number; networkOutput: number }[] = [];
    const interval = setInterval(async () => {
        try {
            const serverStat: compose.DockerComposeStatsResult = await compose.stats("ldes-server");
            serverStats.push({
                cpu: parseFloat(serverStat.CPUPerc.replace("%", "")),
                memory: readableFormatToBytes(serverStat.MemUsage.split("/")[0].trim()),
                networkInput: readableFormatToBytes(serverStat.NetIO.split("/")[0].trim()),
                networkOutput: readableFormatToBytes(serverStat.NetIO.split("/")[1].trim()),
            });
        } catch (_) {}

        try {
            const proxyStat: compose.DockerComposeStatsResult = await compose.stats("nginx");
            proxyStats.push({
                cpu: parseFloat(proxyStat.CPUPerc.replace("%", "")),
                memory: readableFormatToBytes(proxyStat.MemUsage.split("/")[0].trim()),
                networkInput: readableFormatToBytes(proxyStat.NetIO.split("/")[0].trim()),
                networkOutput: readableFormatToBytes(proxyStat.NetIO.split("/")[1].trim()),
            });
        } catch (_) {}
    }, intervalMs);

    // Return a function that stops the metric collector interval and returns the metrics
    return () => {
        clearInterval(interval);
        return {
            serverStats: serverStats,
            proxyStats: proxyStats,
        };
    };
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
    if (stats.length === 0) {
        return {
            avgCpu: 0,
            avgMemory: 0,
            maxCpu: 0,
            maxMemory: 0,
            meanCpu: 0,
            meanMemory: 0,
            networkInput: 0,
            networkOutput: 0,
        };
    }
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
    public readonly latency?: number;
    public readonly pollInterval?: number;
    public readonly memberArrivalTimes?: number[];

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
        latency?: number,
        pollInterval?: number,
        memberArrivalTimes?: number[],
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
        this.latency = latency;
        this.pollInterval = pollInterval;
        this.memberArrivalTimes = memberArrivalTimes;
    }
}

type Metrics = {
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
