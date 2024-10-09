import * as compose from "docker-compose";
import path from "path";
import { fileURLToPath } from "url";
import { enhanced_fetch, replicateLDES } from "ldes-client";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export async function setup(envFile: string) {
    await compose.upAll({ cwd: path.join(__dirname), log: false, composeOptions: ["--env-file", envFile] });
}

export async function awaitOnline() {
    let online = false;
    while (!online) {
        online = await checkIfOnline();
    }
}

async function checkIfOnline() {
    // Do a request to the ldes-server to check if it is online and has some initial data loaded.
    try {
        const response = await fetch("http://localhost:3000/ldes/default");
        return response.ok;
    } catch (_) {
        return false;
    }
}

export async function awaitMemberCount(expectedCount: number) {
    let count = 0;

    const ldesClient = replicateLDES({
        url: "http://localhost:3000/ldes/default",
        polling: true,
        pollInterval: 200,
        fetch: enhanced_fetch({
            safe: true,
        }),
    });

    for await (const element of ldesClient.stream()) {
        if (element) {
            count++;
        }

        if (count >= expectedCount) {
            break;
        }
    }
}

export async function cleanup() {
    await compose.down({ cwd: path.join(__dirname), log: false, commandOptions: ["--volumes"] });
}

export function ensureCleanup() {
    process.once("beforeExit", cleanup);
    process.once("SIGINT", cleanup);
    process.once("SIGQUIT", cleanup);
    process.once("uncaughtException", cleanup);
}
