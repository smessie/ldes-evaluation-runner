import { AppRunner } from "@solid/community-server";

async function run(argv) {
    let variableBindings = {};
    // Check if DATABASE_URL environment variable is set
    if (process.env.DATABASE_URL) {
        variableBindings["urn:solid-server:default:db-url"] = process.env.DATABASE_URL;
    }
    if (process.env.SERVER_HOSTNAME) {
        variableBindings["urn:solid-server:default:ldes-url"] = `http://${process.env.SERVER_HOSTNAME}:3000/ldes`;
        variableBindings["urn:solid-server:default:view-url"] = `http://${process.env.SERVER_HOSTNAME}:3000/ldes/#fragmentation`;
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

    const app = await new AppRunner().create({
        argv: argv,
        variableBindings: variableBindings,
        config: configValue,
    });

    await app.start();
}

run(process.argv).catch(console.error);
