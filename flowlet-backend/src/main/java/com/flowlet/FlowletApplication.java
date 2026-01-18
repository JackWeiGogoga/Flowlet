package com.flowlet;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Flowlet - 可视化内容处理流程编排系统
 */
@SpringBootApplication
@MapperScan("com.flowlet.mapper")
public class FlowletApplication {

    public static void main(String[] args) {
        SpringApplication.run(FlowletApplication.class, args);
    }
}
