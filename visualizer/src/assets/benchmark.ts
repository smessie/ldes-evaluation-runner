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

export function avgStats<T extends Stats | StatsExt>(stats: T[][]): T[] {
    const maxLen = Math.max(...stats.map((itStats) => itStats.length));
    const result = [] as T[];
    const isExt = (stats[0][0] as StatsExt).networkInput !== undefined;
    for (let i = 0; i < maxLen; i++) {
        const iterationResult = {} as T;

        const statsAtIntervalPerIteration = stats.map((itStats) => itStats[i]).filter((s) => s);
        iterationResult.cpu =
            statsAtIntervalPerIteration.reduce((acc, s) => acc + s.cpu, 0) / statsAtIntervalPerIteration.length;
        iterationResult.memory =
            statsAtIntervalPerIteration.reduce((acc, s) => acc + s.memory, 0) / statsAtIntervalPerIteration.length;

        if (isExt) {
            (iterationResult as StatsExt).networkInput =
                statsAtIntervalPerIteration.reduce((acc, s) => acc + (s as StatsExt).networkInput, 0) /
                statsAtIntervalPerIteration.length;
        }
        if (isExt) {
            (iterationResult as StatsExt).networkOutput =
                statsAtIntervalPerIteration.reduce((acc, s) => acc + (s as StatsExt).networkOutput, 0) /
                statsAtIntervalPerIteration.length;
        }
        result.push(iterationResult);
    }
    return result;
}
