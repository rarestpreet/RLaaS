local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])

local current = redis.call('GET', key)

if not current then
    redis.call('SET', key, 1, 'PX', windowMs)
    return { 1, limit - 1, windowMs }
end

current = tonumber(current)
local ttl = redis.call('PTTL', key)
local cooldown = math.max(0, ttl)

if current < limit then
    redis.call('INCR', key)
    return { 1, limit - (current + 1), cooldown }
else
    return { 0, 0, cooldown }
end
