import {v2 as compose} from 'docker-compose'
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export async function setup(envFile: string) {
   await compose.upAll({cwd: path.join(__dirname), log: false, composeOptions: ['--env-file', envFile]});
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
      const response = await fetch('http://localhost:3000/ldes/default');
      return response.ok;
   } catch (_) {
      return false;
   }
}

export async function cleanup() {
   await compose.down({cwd: path.join(__dirname), log: false, commandOptions: ['--volumes']});
}
