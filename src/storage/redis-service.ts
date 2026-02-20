import {WSSharedDoc} from "@/ydoc/ws-shared-doc";
import {redis} from '@/storage/redis';

export const getDocUpdatesKey = (doc: WSSharedDoc) => `doc:${doc.name}:updates`;
export const getDocUpdatesFromQueue = (doc: WSSharedDoc) => {
    return redis.lrangeBuffer(getDocUpdatesKey(doc), 0, -1);
}

export const hasUpdatesByDoc = async (doc: WSSharedDoc) => {
    const key = getDocUpdatesKey(doc);
    console.log('redisKey', key);

    const updates = await redis.lrangeBuffer(key, 0, -1);
    return updates.length > 0;
}

export const pushUpdateToList = async (doc: WSSharedDoc, update: Uint8Array) => {
    await redis.pipeline()
        .rpush(getDocUpdatesKey(doc), Buffer.from(update))
        .exec();
}

export const deleteRedisRecordByKey = async (key: string): Promise<number> => {
    return redis.del(key);
}