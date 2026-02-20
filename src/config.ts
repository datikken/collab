import dotenv from "dotenv";
import process from "node:process";

dotenv.config();

export const PORT = 4000;
export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;

export const CALLBACK_TIMEOUT = 500000;
export const REDIS_CLUSTER_NODES = process.env.REDIS_CLUSTER_NODES as string;
export const COLLABORANT_API_KEY = process.env.COLLABORANT_API_KEY;

export const SENTRY_DSN = process.env.SENTRY_DSN as string;
export const NODE_ENV = process.env.NODE_ENV as string;
export const IMPERIUM_API = process.env.IMPERIUM_API;