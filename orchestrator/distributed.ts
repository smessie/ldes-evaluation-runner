import ipc from "node-ipc";

const connectedClients: { socket: any; address: string; port: number }[] = [];

let results: {
    numClients: number;
    time: number;
    clientStats: { cpu: number; memory: number }[];
    avgMembersCount: number;
    avgQuadsCount: number;
    avgLatency: number;
    avgMemberArrivalTimes: number[];
}[] = [];

export async function initiateDistribution() {
    ipc.config.id = "server";
    ipc.config.silent = true;

    ipc.serveNet("0.0.0.0", 8000, () => {
        ipc.server.on("connect", (socket) => {
            // Called when a client connects to the server.
            console.log(`[${new Date().toISOString()}] new client connected`, socket.remoteAddress, socket.remotePort);
            connectedClients.push({ socket: socket, address: socket.remoteAddress, port: socket.remotePort });
        });

        ipc.server.on("socket.disconnected", (socket) => {
            // Called when a client disconnects from the server.
            console.error(`[${new Date().toISOString()}] Client disconnected`, socket.remoteAddress, socket.remotePort);
            const client = connectedClients.find(
                (c) => c.address === socket.remoteAddress && c.port === socket.remotePort,
            );
            if (client) {
                console.log(`[${new Date().toISOString()}] Found client, removing from list`);
                connectedClients.splice(connectedClients.indexOf(client), 1);
            }
        });

        ipc.server.on("results", (data, socket) => {
            // Called when a client sends results to the server.
            console.log(`[${new Date().toISOString()}] Got results from client`, socket.remoteAddress, socket.remotePort);
            results.push(data);
        });
    });

    ipc.server.start();

    // Wait 1500ms to allow clients to connect
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // We expect at least one client to be connected
    if (connectedClients.length === 0) {
        throw new Error(
            "No clients connected. Did you forget to start the clients? (node client <name> <server-hostname>)",
        );
    }
}

export function stopDistribution() {
    // Stop the IPC server
    ipc.server.stop();

    // Make sure to also close any connected clients
    connectedClients.forEach((client) => {
        client.socket.destroy();
    });
}

export function startClients(numClients: number, file: string, intervalMs: number, args: string[]): number {
    results = [];

    let clientsToStart: number = numClients;
    let instancesInitialized: number = 0;
    const clientsPerInstance: number = Math.ceil(clientsToStart / connectedClients.length);
    for (const client of connectedClients) {
        const clientsForInstance: number = Math.min(clientsPerInstance, clientsToStart);
        clientsToStart -= clientsForInstance;
        if (clientsForInstance > 0) {
            instancesInitialized++;
            ipc.server.emit(client.socket, "start", { clients: clientsForInstance, file, intervalMs, args });
        }
    }
    return instancesInitialized;
}

export async function getResultsFromClients(expected: number): Promise<{
    time: number;
    clientStats: { cpu: number; memory: number }[];
    avgMembersCount: number;
    avgQuadsCount: number;
    avgLatency: number;
    avgMemberArrivalTimes: number[];
}> {
    // Wait till all clients have sent their results
    await new Promise((resolve) => {
        const interval = setInterval(() => {
            if (results.length === expected) {
                clearInterval(interval);
                resolve(results);
            }
        }, 1000);
    });

    // Aggregate results based on the number of clients
    const numClients = results.reduce((acc, result) => acc + result.numClients, 0);
    const time = results.reduce((acc, result) => acc + result.time * result.numClients, 0) / numClients;
    const avgMembersCount =
        results.reduce((acc, result) => acc + result.avgMembersCount * result.numClients, 0) / numClients;
    const avgQuadsCount =
        results.reduce((acc, result) => acc + result.avgQuadsCount * result.numClients, 0) / numClients;
    const avgLatency =
        results.reduce((acc, result) => acc + result.avgLatency * result.numClients, 0) / numClients;
    const avgMemberArrivalTimes = [];
    for (let i = 0; i < results[0].avgMemberArrivalTimes?.length; i++) {
        avgMemberArrivalTimes.push(
            results.reduce((acc, result) => acc + result.avgMemberArrivalTimes[i] * result.numClients, 0) / numClients,
        );
    }

    const clientStats = [];
    const maxClientStatsLength = Math.max(...results.map((result) => result.clientStats.length));
    const numClientResults = results.length;
    for (let i = 0; i < maxClientStatsLength; i++) {
        clientStats.push({
            cpu: results.reduce((acc, result) => acc + (result.clientStats[i]?.cpu ?? 0), 0) / numClientResults,
            memory: results.reduce((acc, result) => acc + (result.clientStats[i]?.memory ?? 0), 0) / numClientResults,
        });
    }

    return {
        time: time,
        clientStats: clientStats,
        avgMembersCount: avgMembersCount,
        avgQuadsCount: avgQuadsCount,
        avgLatency: avgLatency,
        avgMemberArrivalTimes: avgMemberArrivalTimes,
    };
}
