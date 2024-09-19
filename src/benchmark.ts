import type {ChildProcess} from 'node:child_process';
import {fork} from 'node:child_process';
import pidusage from 'pidusage';
import {cleanup} from "./setup";
import {v2 as compose} from '@smessie/docker-compose';

export async function runBenchmarkIteration(file: string, config: any): Promise<BenchmarkResult> {
   // Start the child process executing the code we want to benchmark
   let args: string[] = [];
   if (config.type === 'UPDATING_LDES') {
      args = [config.expectedCount.toString(), config.pollInterval.toString()];
   }

   let resultMembersCount = 0;
   let resultQuadsCount = 0;
   const child = fork(file, args);
   child.on('message', (message) => {
      if (typeof message === 'object' && 'resultMembers' in message) {
         resultMembersCount = message.resultMembers as number;
      }
      if (typeof message === 'object' && 'resultQuads' in message) {
         resultQuadsCount = message.resultQuads as number;
      }
   });

   // Stop the child process when the parent process exits
   stopChildProcessOnExit(child);

   // Start collecting metrics
   const metrics = collectMetrics(child, 1000);

   // Wait for the child process to finish
   const promise: Promise<Metrics> = new Promise((resolve, reject): void => {
      child.on('close', () => {
         resolve(metrics());
      });
      child.on('error', reject);
      child.stdout?.on('data', console.log);
   });
   const metricsResult = await promise;

   const clientLoad: Load = statsToLoad(metricsResult.clientStats);
   const serverLoad: Load = statsToLoad(metricsResult.serverStats);

   if (config.type === 'UPDATING_LDES') {
      return new BenchmarkResult(metricsResult.time, clientLoad, serverLoad, metricsResult.clientStats, metricsResult.serverStats, resultMembersCount, resultMembersCount / metricsResult.time, resultQuadsCount, resultQuadsCount / metricsResult.time, config.pollInterval);
   } else {
      return new BenchmarkResult(metricsResult.time, clientLoad, serverLoad, metricsResult.clientStats, metricsResult.serverStats, undefined, undefined, undefined, undefined, undefined);
   }
}

function collectMetrics(child: ChildProcess, intervalMs: number = 100): () => Metrics {
   if (!child.pid) {
      throw new Error('Child process does not have a PID');
   }

   // Collect cpu and memory metrics every intervalMs milliseconds
   const clientStats: { cpu: number, memory: number }[] = [];
   const serverStats: { cpu: number, memory: number, networkInput: number, networkOutput: number }[] = [];
   const interval = setInterval(async () => {
      try {
         const clientStat = await pidusage(child.pid!);
         clientStats.push({cpu: clientStat.cpu, memory: clientStat.memory});

         const serverStat: compose.DockerComposeStatsResult = await compose.stats('ldes-server');
         serverStats.push({
            cpu: parseFloat(serverStat.CPUPerc.replace('%', '')),
            memory: readableFormatToBytes(serverStat.MemUsage.split('/')[0].trim()),
            networkInput: readableFormatToBytes(serverStat.NetIO.split('/')[0].trim()),
            networkOutput: readableFormatToBytes(serverStat.NetIO.split('/')[1].trim()),
         });
      } catch (_) {
      }
   }, intervalMs);

   // Start a timer to measure the total time
   const hrStart = process.hrtime();

   // Return a function that stops the metric collector interval and returns the metrics
   return () => {
      const hrEnd = process.hrtime(hrStart);
      clearInterval(interval);
      return {time: hrEnd[0] + hrEnd[1] / 1_000, clientStats: clientStats, serverStats: serverStats};
   }
}

function stopChildProcessOnExit(child: ChildProcess): void {
   let terminated = false;
   child.on('exit', () => {
      terminated = true;
   });
   const callOnExit = async (code: any) => {
      if (!child.killed && !terminated) {
         child.kill();
      }

      console.log(`Exiting because of ${code}. Cleaning up...`);
      await cleanup();
      process.exit();
   };
   process.on('exit', callOnExit);
   process.on('SIGINT', callOnExit);
   process.on('SIGQUIT', callOnExit);
   process.on('uncaughtException', callOnExit);
}

function readableFormatToBytes(value: string): number {
   const match = value.match(/^([0-9.]+)([A-z]+)$/);
   if (!match) {
      throw new Error(`Invalid value: ${value}`);
   }

   const number = parseFloat(match[1]);
   switch (match[2]) {
      case 'B':
         return number;
      case 'KiB':
         return number * 1024;
      case 'MiB':
         return number * 1024 * 1024;
      case 'GiB':
         return number * 1024 * 1024 * 1024;
      case 'TiB':
         return number * 1024 * 1024 * 1024 * 1024;
      case 'KB':
         return number * 1000;
      case 'MB':
         return number * 1000 * 1000;
      case 'GB':
         return number * 1000 * 1000 * 1000;
      case 'TB':
         return number * 1000 * 1000 * 1000 * 1000;
      default:
         throw new Error(`Invalid unit: ${match[2]}`);
   }
}

function statsToLoad(stats: { cpu: number, memory: number, networkInput?: number, networkOutput?: number }[]): Load {
   const avgCpu = stats.reduce((acc, val) => acc + val.cpu, 0) / stats.length;
   const avgMemory = stats.reduce((acc, val) => acc + val.memory, 0) / stats.length;
   const maxCpu = stats.reduce((acc, val) => Math.max(acc, val.cpu), 0);
   const maxMemory = stats.reduce((acc, val) => Math.max(acc, val.memory), 0);
   const networkInput = stats[stats.length - 1].networkInput;
   const networkOutput = stats[stats.length - 1].networkOutput;
   return {avgCpu, avgMemory, maxCpu, maxMemory, networkInput: networkInput, networkOutput: networkOutput};
}

export class BenchmarkResult {
   public readonly time: number;
   public readonly clientLoad: Load;
   public readonly serverLoad: Load;
   public readonly clientStats?: { cpu: number, memory: number }[];
   public readonly serverStats?: { cpu: number, memory: number, networkInput: number, networkOutput: number }[];
   public readonly membersCount?: number;
   public readonly membersThroughput?: number;
   public readonly quadsCount?: number;
   public readonly quadsThroughput?: number;
   public readonly pollInterval?: number;

   constructor(time: number, clientLoad: Load, serverLoad: Load, clientStats: {
      cpu: number,
      memory: number
   }[], serverStats: {
      cpu: number,
      memory: number,
      networkInput: number,
      networkOutput: number
   }[], membersCount?: number, membersThroughput?: number, quadsCount?: number, quadsThroughput?: number, pollInterval?: number) {
      this.time = time;
      this.clientLoad = clientLoad;
      this.serverLoad = serverLoad;
      this.clientStats = clientStats;
      this.serverStats = serverStats
      this.membersCount = membersCount;
      this.membersThroughput = membersThroughput;
      this.quadsCount = quadsCount;
      this.quadsThroughput = quadsThroughput;
      this.pollInterval = pollInterval;
   }
}

type Metrics = {
   time: number,
   clientStats: { cpu: number, memory: number }[],
   serverStats: { cpu: number, memory: number, networkInput: number, networkOutput: number }[]
};

export type Load = {
   avgCpu: number,
   avgMemory: number,
   maxCpu: number,
   maxMemory: number,
   networkInput?: number,
   networkOutput?: number
};
