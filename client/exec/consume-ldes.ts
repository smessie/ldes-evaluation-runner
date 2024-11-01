import { enhanced_fetch, Ordered, replicateLDES } from "ldes-client";

const serverHostname = process.argv[2] || "localhost";
const expectedCount = parseInt(process.argv[3]) || 1000;
const pollInterval = parseInt(process.argv[4]) || 200;
let order: Ordered | undefined;
if (process.argv[5] === "ascending" || process.argv[5] === "descending" || process.argv[5] === "none") {
    order = process.argv[5] as Ordered;
}
const lastVersionOnly = process.argv[7] === "true";

// Wait till the LDES is online
let online = false;
while (!online) {
    try {
        const response = await fetch(`http://${serverHostname}:3000/ldes/default`);
        online = response.ok;
    } catch (_) {}
}

const ldesClient = replicateLDES({
    url: `http://${serverHostname}:3000/ldes/default`,
    polling: true,
    pollInterval: pollInterval,
    fetch: enhanced_fetch({
        safe: true,
    }),
    lastVersionOnly: lastVersionOnly,
}, order);

console.log(`Expecting ${expectedCount} elements`);

let count = 0;
let countQuads = 0;
let totalLatency = 0;

for await (const element of ldesClient.stream()) {
    if (element) {
        const latency = Date.now() - element.created!.getTime();
        totalLatency += latency;

        count++;
        countQuads += element.quads.length;
        if (count % 1000 === 0) {
            console.log(`${count} with ${element.quads.length} quads and ${latency}ms latency`);
        }
    }

    if (count >= expectedCount) {
        break;
    }
}

if (process.send) {
    process.send({
        resultMembers: count,
        resultQuads: countQuads,
        latency: totalLatency / count,
    });
} else {
    console.log(`No process.send found. Result: ${count} elements with ${countQuads} quads`);
}
