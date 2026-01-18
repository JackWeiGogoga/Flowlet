package com.flowlet.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 异步配置
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {
}
