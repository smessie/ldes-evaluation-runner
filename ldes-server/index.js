import { AppRunner, joinFilePath } from "@solid/community-server";
import { ComponentsManager } from "componentsjs";

async function run(argv) {
    let variableBindings = {};
    // Check if DATABASE_URL environment variable is set
    if (process.env.DATABASE_URL) {
        variableBindings["urn:solid-server:default:db-url"] = process.env.DATABASE_URL;
    }
    if (process.env.DATABASE_TYPE) {
        variableBindings["urn:solid-server:default:db-type"] = await instantiateFromConfig(
            process.env.DATABASE_TYPE,
            ['node_modules/ldes-server/dist/repositories/MongoDBRepository.jsonld', 'node_modules/ldes-server/dist/repositories/RedisRepository.jsonld'],
            variableBindings,
        );
    }
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

    const app = await new AppRunner().create({
        argv: argv,
        variableBindings: variableBindings,
        config: configValue,
    });

    await app.start();
}

/**
 * Returns a component instantiated from a Components.js configuration.
 *
 * Source: https://github.com/CommunitySolidServer/CommunitySolidServer/blob/ecd031e69f7c317ae03411c680682a1dcdff542e/test/integration/Config.ts#L11
 */
export async function instantiateFromConfig(
    componentUrl,
    configPaths,
    variables,
) {
    // Initialize the Components.js loader
    const mainModulePath = joinFilePath(__dirname, '../../');
    const manager = await ComponentsManager.build({
        mainModulePath,
        logLevel: 'error',
        typeChecking: false,
    });

    if (!Array.isArray(configPaths)) {
        configPaths = [ configPaths ];
    }

    // Instantiate the component from the config(s)
    for (const configPath of configPaths) {
        await manager.configRegistry.register(configPath);
    }
    return manager.instantiate(componentUrl, { variables });
}

run(process.argv).catch(console.error);
