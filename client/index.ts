import ipc from "node-ipc";
import { ChildProcess, fork } from "node:child_process";
import pidusage from "pidusage";

type ClientMetrics = {
    time: number;
    clientStats: { cpu: number; memory: number }[];
};

async function main() {
    if (process.argv.length < 4) {
        console.error("Usage: node client <name> <server-hostname>");
        process.exit(1);
    }

    const name = process.argv[2];
    const serverHostname = process.argv[3];

    ipc.config.id = name;
    ipc.config.retry = 500;
    ipc.config.silent = true;

    let connected = false;

    ipc.connectToNet("server", serverHostname, () => {
        ipc.of.server.on("connect", () => {
            // Called when the client connected to the server.
            console.log("Connected to server");
            connected = true;
        });

        ipc.of.server.on("disconnect", () => {
            // Called when the server disconnects from the client or the client fails to connect to the server.
            if (connected) {
                console.log("Disconnected from server");
                connected = false;
            }
        });

        ipc.of.server.on("start", async (data) => {
            console.log(`Starting ${data.clients} clients with file ${data.file} and args ${data.args}`);
            await startClients(data.clients, data.file, data.args);
        });
    });
}

async function startClients(numClients: number, file: string, args: string[]) {
    const children: {
        child: ChildProcess;
        promise: Promise<{
            resultMembersCount: number;
            resultQuadsCount: number;
            latency: number;
        }>;
    }[] = [];

    for (let i = 0; i < numClients; i++) {
        const child = fork(file, args);

        // Stop the child process when the parent process exits
        stopChildProcessOnExit(child);

        const promise: Promise<{
            resultMembersCount: number;
            resultQuadsCount: number;
            latency: number;
        }> = new Promise((resolve, reject) => {
            let resultMembersCount = 0;
            let resultQuadsCount = 0;
            let latency = 0;
            child.on("message", (message) => {
                if (typeof message === "object" && "resultMembers" in message) {
                    resultMembersCount = message.resultMembers as number;
                }
                if (typeof message === "object" && "resultQuads" in message) {
                    resultQuadsCount = message.resultQuads as number;
                }
                if (typeof message === "object" && "latency" in message) {
                    latency = message.latency as number;
                }
            });

            child.on("close", () => {
                resolve({ resultMembersCount, resultQuadsCount, latency });
            });
            child.on("error", reject);
            if (i === 0) {
                child.stdout?.on("data", console.log);
            }
        });

        children.push({ child, promise });
    }

    // Start collecting metrics
    const metrics = collectMetrics(
        children.map((c) => c.child),
        1000,
    );

    // Wait for the child processes to finish
    const results = await Promise.all(children.map((c) => c.promise));
    const avgMembersCount = results.reduce((acc, val) => acc + val.resultMembersCount, 0) / results.length;
    const avgQuadsCount = results.reduce((acc, val) => acc + val.resultQuadsCount, 0) / results.length;
    const avgLatency = results.reduce((acc, val) => acc + val.latency, 0) / results.length;

    const metricsResult = metrics();

    // Make sure the child processes are stopped.
    for (const child of children) {
        child.child.kill();
    }

    // Send the results to the server
    ipc.of.server.emit("results", {
        numClients: numClients,
        time: metricsResult.time,
        clientStats: metricsResult.clientStats,
        avgMembersCount: avgMembersCount,
        avgQuadsCount: avgQuadsCount,
        avgLatency: avgLatency,
    });
}

function stopChildProcessOnExit(child: ChildProcess): void {
    let terminated = false;
    child.on("exit", () => {
        terminated = true;
    });
    const callOnExit = (code: any) => {
        if (!child.killed && !terminated) {
            child.kill();
            console.log(`Exiting because of ${code}. Cleaning up...`);
        }
    };
    process.once("exit", callOnExit);
    process.once("SIGINT", callOnExit);
    process.once("SIGQUIT", callOnExit);
    process.once("uncaughtException", callOnExit);
}

function collectMetrics(children: ChildProcess[], intervalMs: number = 100): () => ClientMetrics {
    for (const child of children) {
        if (!child.pid) {
            throw new Error("Child process does not have a PID");
        }
    }

    // Collect cpu and memory metrics every intervalMs milliseconds
    const clientStats: { cpu: number; memory: number }[] = [];
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
        };
    };
}

main().catch(console.error);
