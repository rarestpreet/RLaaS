local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local refillIntervalMs = tonumber(ARGV[3])
local ttlMs = tonumber(ARGV[4])

-- Use Redis server time directly (eliminates application server clock skew)
local redisTime = redis.call('TIME')
local currentTimeMs = math.floor(tonumber(redisTime[1]) * 1000 + tonumber(redisTime[2]) / 1000)

local data = redis.call('HMGET', key, 'tokens', 'lastRefilledAt')

if not data[1] then
    local remaining = capacity - 1
    redis.call('HSET', key, 'tokens', remaining, 'lastRefilledAt', currentTimeMs)
    redis.call('PEXPIRE', key, ttlMs)
    return { 1, remaining, refillIntervalMs }
end

local tokens = tonumber(data[1])
local lastRefilledAt = tonumber(data[2])
local elapsedTime = math.max(0, currentTimeMs - lastRefilledAt)
local intervalsElapsed = math.floor(elapsedTime / refillIntervalMs)
local tokensToAdd = intervalsElapsed * refillRate

-- Direct range clamping using math.min and math.max
local refilledTokens = math.min(capacity, math.max(0, tokens) + tokensToAdd)

local updatedRefillAt = lastRefilledAt
if refilledTokens >= capacity then
    updatedRefillAt = currentTimeMs
elseif intervalsElapsed > 0 then
    updatedRefillAt = lastRefilledAt + (intervalsElapsed * refillIntervalMs)
end

if refilledTokens > 0 then
    local remaining = refilledTokens - 1
    redis.call('HSET', key, 'tokens', remaining, 'lastRefilledAt', updatedRefillAt)
    redis.call('PEXPIRE', key, ttlMs)
    local nextRefillMs = math.max(0, refillIntervalMs - (currentTimeMs - updatedRefillAt))
    return { 1, remaining, nextRefillMs }
else
    local cooldown = math.max(0, refillIntervalMs - (currentTimeMs - lastRefilledAt))
    return { 0, 0, cooldown }
end
