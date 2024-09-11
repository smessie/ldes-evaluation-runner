import type {ChildProcess} from 'node:child_process';
import {execFile} from 'node:child_process';
import pidusage from 'pidusage';
import {cleanup} from "./setup";

export async function runBenchmarkIteration(file: string, config: any): Promise<BenchmarkResult> {
   // Start the child process executing the code we want to benchmark
   let args: string[] = [];
   if (config.type === 'UPDATING_LDES') {
      args = [config.expectedCount.toString(), config.pollInterval.toString()];
   }

   let resultMembersCount = 0;
   let resultQuadsCount = 0;
   const child = execFile('node', [file, ...args], (error, stdout, stderr) => {
      if (error) {
         throw error;
      }
      console.log(stdout);
      if (stdout.includes('Result-Members=')) {
         resultMembersCount = parseInt(stdout.split('Result-Members=')[1].split('\n')[0]);
      }
      if (stdout.includes('Result-Quads=')) {
         resultQuadsCount = parseInt(stdout.split('Result-Quads=')[1].split('\n')[0]);
      }
   });

   // Stop the child process when the parent process exits
   stopChildProcessOnExit(child);

   // Start collecting metrics
   const metrics = collectMetrics(child);

   // Wait for the child process to finish
   const promise: Promise<Metrics> = new Promise((resolve, reject): void => {
      child.on('close', () => {
         resolve(metrics());
      });
      child.on('error', reject);
      child.stdout?.on('data', console.log);
   });
   const metricsResult = await promise;

   const avgCpu = metricsResult.stats.reduce((acc, val) => acc + val.cpu, 0) / metricsResult.stats.length;
   const avgMemory = metricsResult.stats.reduce((acc, val) => acc + val.memory, 0) / metricsResult.stats.length;
   const maxCpu = metricsResult.stats.reduce((acc, val) => Math.max(acc, val.cpu), 0);
   const maxMemory = metricsResult.stats.reduce((acc, val) => Math.max(acc, val.memory), 0);
   const clientLoad: Load = {avgCpu, avgMemory, maxCpu, maxMemory};

   if (config.type === 'UPDATING_LDES') {
      return new BenchmarkResult(metricsResult.time, clientLoad, resultMembersCount, resultMembersCount / metricsResult.time, resultQuadsCount, resultQuadsCount / metricsResult.time, config.pollInterval);
   } else {
      return new BenchmarkResult(metricsResult.time, clientLoad, undefined, undefined, undefined, undefined, undefined);
   }
}

function collectMetrics(child: ChildProcess, intervalMs: number = 100): () => Metrics {
   if (!child.pid) {
      throw new Error('Child process does not have a PID');
   }

   // Collect cpu and memory metrics every intervalMs milliseconds
   const stats: { cpu: number, memory: number }[] = [];
   const interval = setInterval(async () => {
      const stat = await pidusage(child.pid!);
      stats.push({cpu: stat.cpu, memory: stat.memory});
   }, intervalMs);

   // Start a timer to measure the total time
   const hrStart = process.hrtime();

   // Return a function that stops the metric collector interval and returns the metrics
   return () => {
      const hrEnd = process.hrtime(hrStart);
      clearInterval(interval);
      return {time: hrEnd[0] + hrEnd[1] / 1_000, stats: stats};
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

export class BenchmarkResult {
   public readonly time: number;
   public readonly clientLoad: Load;
   public readonly membersCount?: number;
   public readonly membersThroughput?: number;
   public readonly quadsCount?: number;
   public readonly quadsThroughput?: number;
   public readonly pollInterval?: number;

   constructor(time: number, clientLoad: Load, membersCount?: number, membersThroughput?: number, quadsCount?: number, quadsThroughput?: number, pollInterval?: number) {
      this.time = time;
      this.clientLoad = clientLoad;
      this.membersCount = membersCount;
      this.membersThroughput = membersThroughput;
      this.quadsCount = quadsCount;
      this.quadsThroughput = quadsThroughput;
      this.pollInterval = pollInterval;
   }
}

type Metrics = { time: number, stats: { cpu: number, memory: number }[] };

export type Load = { avgCpu: number, avgMemory: number, maxCpu: number, maxMemory: number };
