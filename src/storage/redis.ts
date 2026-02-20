import Redis, {ClusterNode} from "ioredis";
import {NODE_ENV, REDIS_CLUSTER_NODES} from "@/config";

const keyPrefix = `collaborant:${NODE_ENV}`;
const nodesStr = REDIS_CLUSTER_NODES;
if (!nodesStr) {
    throw new Error("Missing required environment variable: REDIS_CLUSTER_NODES");
}

const nodes = nodesStr.split(',').map(el => {
    const ar = el.split(':');
    return {
        host: ar[0].toString(),
        port: parseInt(ar[1]),
    }
}) as ClusterNode[];

const options = {
    keyPrefix
};

export const redis = new Redis.Cluster(nodes, options);

export const pub = new Redis.Cluster(nodes, options);

export const sub = new Redis.Cluster(nodes, options);
