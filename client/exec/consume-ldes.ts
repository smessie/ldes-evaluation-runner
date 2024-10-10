import { enhanced_fetch, replicateLDES } from "ldes-client";

const expectedCount = parseInt(process.argv[2]) || 1000;
const pollInterval = parseInt(process.argv[3]) || 200;

const ldesClient = replicateLDES({
    url: "http://localhost:3000/ldes/default",
    polling: true,
    pollInterval: pollInterval,
    fetch: enhanced_fetch({
        safe: true,
    }),
});

console.log(`Expecting ${expectedCount} elements`);

let count = 0;
let countQuads = 0;

for await (const element of ldesClient.stream()) {
    if (element) {
        count++;
        countQuads += element.quads.length;
        if (count % 1000 === 0) {
            console.log(`${count} with ${element.quads.length} quads`);
        }
    }

    if (count >= expectedCount) {
        break;
    }
}

if (process.send) {
    process.send({ resultMembers: count, resultQuads: countQuads });
} else {
    console.log(`No process.send found. Result: ${count} elements with ${countQuads} quads`);
}
