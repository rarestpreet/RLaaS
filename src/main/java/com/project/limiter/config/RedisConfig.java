package com.project.limiter.config;

import io.lettuce.core.ClientOptions;
import io.lettuce.core.ClientOptions.DisconnectedBehavior;
import io.lettuce.core.SocketOptions;
import org.springframework.boot.autoconfigure.data.redis.LettuceClientConfigurationBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();

        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public LettuceClientConfigurationBuilderCustomizer lettuceCustomizer() {
        return clientConfigurationBuilder -> {
            SocketOptions socketOptions = SocketOptions.builder()
                    .connectTimeout(Duration.ofMillis(200))
                    .build();

            ClientOptions clientOptions = ClientOptions.builder()
                    .socketOptions(socketOptions)
                    .disconnectedBehavior(DisconnectedBehavior.REJECT_COMMANDS)
                    .autoReconnect(true)
                    .build();

            clientConfigurationBuilder
                    .commandTimeout(Duration.ofMillis(250))
                    .clientOptions(clientOptions);
        };
    }
}
