import {replicateLDES} from "ldes-client";

const expectedCount = parseInt(process.argv[2]) || 1000;
const pollInterval = parseInt(process.argv[3]) || 200;

const ldesClient = replicateLDES({
   url: "http://localhost:3000/ldes/default",
   polling: true,
   pollInterval: pollInterval,
});

console.log(`Expecting ${expectedCount} elements`);

let count = 0;
let countQuads = 0;

const reader = ldesClient.stream().getReader();

let element = await reader.read();
while (element) {
   if (element.value) {
      count++;
      countQuads += element.value.quads.length;
      if (count % 1000 === 0) {
         console.log(`${count} with ${element.value.quads.length} quads`);
      }
   }

   if (count >= expectedCount) {
      await reader.cancel();
      element = null;
   } else {
      element = await reader.read();
   }
}

console.log(`Result-Members=${count}`);
console.log(`Result-Quads=${countQuads}`);
