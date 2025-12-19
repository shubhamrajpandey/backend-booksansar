import redis from "redis";

export const redisClient = redis.createClient({
    url:"redis://localhost:6379",
})

redisClient.on("connect",()=>{
    console.log("Redis Connected");
})

redisClient.connect();
