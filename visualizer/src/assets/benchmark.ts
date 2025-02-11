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

export type Stats = {
    cpu: number;
    memory: number;
};

export type StatsExt = Stats & {
    networkInput: number;
    networkOutput: number;
};

export type BenchmarkResult = {
    name?: string;
    time: number;
    clientLoad: Load;
    serverLoad: Load;
    proxyLoad: Load;
    clientStats?: Stats[];
    serverStats?: StatsExt[];
    proxyStats?: StatsExt[];
    membersCount?: number;
    membersThroughput?: number;
    quadsCount?: number;
    quadsThroughput?: number;
    pollInterval?: number;
    memberArrivalTimes?: number[];
};

export type BenchmarkStats = { name: string; clientStats: Stats[]; serverStats: StatsExt[]; proxyStats: StatsExt[] };

export function medianStats<T extends Stats | StatsExt>(stats: T[][]): T[] {
    const maxLen = Math.max(...stats.map((itStats) => itStats.length));
    const result = [] as T[];
    const isExt = (stats[0][0] as StatsExt)?.networkInput !== undefined;
    for (let i = 0; i < maxLen; i++) {
        const iterationResult = {} as T;

        const statsAtIntervalPerIteration = stats.map((itStats) => itStats[i]).filter((s) => s);
        iterationResult.cpu = median(statsAtIntervalPerIteration.map((s) => s.cpu));
        iterationResult.memory = median(statsAtIntervalPerIteration.map((s) => s.memory));

        if (isExt) {
            (iterationResult as StatsExt).networkInput = median(statsAtIntervalPerIteration.map((s) => (s as StatsExt).networkInput));
            (iterationResult as StatsExt).networkOutput = median(statsAtIntervalPerIteration.map((s) => (s as StatsExt).networkOutput));
        }
        result.push(iterationResult);
    }
    return result;
}

export function median(arr: number[]): number {
    const mid = Math.floor(arr.length / 2);
    const nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (((nums[mid - 1] as any) + nums[mid]) as any) / 2;
}
