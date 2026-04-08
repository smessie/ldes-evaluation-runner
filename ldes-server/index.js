import { AppRunner, joinFilePath } from "@solid/community-server";
import { writeFile } from "node:fs";

async function run(argv) {
    let variableBindings = {};
    if (process.env.SERVER_HOSTNAME) {
        variableBindings["urn:solid-server:default:ldes-url"] = `http://${process.env.SERVER_HOSTNAME}:3000/ldes`;
        variableBindings["urn:solid-server:default:view-url"] = `http://${process.env.SERVER_HOSTNAME}:3000/ldes/#fragmentation`;
    }
    if (process.env.SERVER_NAMED_GRAPHS) {
        variableBindings["urn:solid-server:default:named-graphs"] = process.env.SERVER_NAMED_GRAPHS;
    }

    // Get -c or --config value
    let configValue;
    let config = argv.find((arg, index) => {
        return arg === "-c" || arg === "--config";
    });
    if (config) {
        // Get the value of -c or --config
        let configIndex = argv.indexOf(config);
        configValue = argv[configIndex + 1];
    }

    const configs = [configValue];

    if (process.env.REPOSITORY_CONFIG) {
        const tempConfigPath = joinFilePath(__dirname, "temp-repository-config.jsonld");
        writeFile(tempConfigPath, process.env.REPOSITORY_CONFIG, (err) => {
            if (err) {
                console.error("Error writing temporary repository config file:", err);
            }
        });
        configs.push(tempConfigPath);
    }

    const app = await new AppRunner().create({
        argv: argv,
        variableBindings: variableBindings,
        config: configs,
    });

    await app.start();
}

run(process.argv).catch(console.error);
