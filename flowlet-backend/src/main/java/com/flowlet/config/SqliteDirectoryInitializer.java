package com.flowlet.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Component
public class SqliteDirectoryInitializer implements BeanFactoryPostProcessor, EnvironmentAware {

    private static final String SQLITE_URL_PREFIX = "jdbc:sqlite:";

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        if (environment == null) {
            return;
        }
        String url = environment.getProperty("spring.datasource.url");
        ensureSqliteDirectory(url);
    }

    private void ensureSqliteDirectory(String url) {
        if (url == null || !url.startsWith(SQLITE_URL_PREFIX)) {
            return;
        }
        String path = url.substring(SQLITE_URL_PREFIX.length());
        if (path.isBlank() || ":memory:".equals(path)) {
            return;
        }
        Path dbPath = Paths.get(path);
        Path dir = dbPath.getParent();
        if (dir == null) {
            return;
        }
        try {
            Files.createDirectories(dir);
            log.info("Ensured SQLite directory exists: {}", dir.toAbsolutePath());
        } catch (Exception e) {
            log.error("Failed to create SQLite directory: {}", dir.toAbsolutePath(), e);
        }
    }
}
