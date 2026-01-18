package com.flowlet.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.Objects;

/**
 * Vector Store Proxy Controller
 * 
 * 将 /api/vector-stores/* 的管理 API 代理到 Python Vector Store 服务
 */
@Slf4j
@RestController
@RequestMapping("/api/vector-stores")
@RequiredArgsConstructor
public class VectorStoreProxyController {

    private final WebClient.Builder webClientBuilder;

    @Value("${flowlet.vector-store.base-url:http://localhost:18091}")
    private String vectorStoreBaseUrl;

    /**
     * 代理 POST /api/vector-stores/test-connection
     */
    @PostMapping("/test-connection")
    public Mono<Map<String, Object>> testConnection(@NonNull @RequestBody Map<String, Object> request) {
        log.info("Proxying test-connection request to Vector Store service");
        log.info("Request payload: {}", request);
        
        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(vectorStoreBaseUrl)).build();
        ParameterizedTypeReference<Map<String, Object>> responseType = 
                new ParameterizedTypeReference<>() {};
        
        return client.post()
                .uri("/vector-stores/test-connection")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(responseType)
                .doOnSuccess(response -> log.info("Test connection successful: {}", response))
                .doOnError(error -> log.error("Test connection failed", error));
    }

    /**
     * 代理 POST /api/vector-stores/list-databases
     */
    @PostMapping("/list-databases")
    public Mono<Map<String, Object>> listDatabases(@NonNull @RequestBody Map<String, Object> request) {
        log.info("Proxying list-databases request to Vector Store service");
        
        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(vectorStoreBaseUrl)).build();
        ParameterizedTypeReference<Map<String, Object>> responseType = 
                new ParameterizedTypeReference<>() {};
        
        return client.post()
                .uri("/vector-stores/list-databases")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(responseType)
                .doOnSuccess(response -> log.info("List databases successful"))
                .doOnError(error -> log.error("List databases failed", error));
    }

    /**
     * 代理 POST /api/vector-stores/list-collections
     */
    @PostMapping("/list-collections")
    public Mono<Map<String, Object>> listCollections(@NonNull @RequestBody Map<String, Object> request) {
        log.info("Proxying list-collections request to Vector Store service");
        
        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(vectorStoreBaseUrl)).build();
        ParameterizedTypeReference<Map<String, Object>> responseType = 
                new ParameterizedTypeReference<>() {};
        
        return client.post()
                .uri("/vector-stores/list-collections")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(responseType)
                .doOnSuccess(response -> log.info("List collections successful"))
                .doOnError(error -> log.error("List collections failed", error));
    }

    /**
     * 代理 POST /api/vector-stores/create-collection
     * 创建新的向量集合
     */
    @PostMapping("/create-collection")
    public Mono<Map<String, Object>> createCollection(@NonNull @RequestBody Map<String, Object> request) {
        log.info("Proxying create-collection request to Vector Store service");
        log.debug("Create collection request payload: {}", request);
        
        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(vectorStoreBaseUrl)).build();
        ParameterizedTypeReference<Map<String, Object>> responseType = 
                new ParameterizedTypeReference<>() {};
        
        return client.post()
                .uri("/vector-stores/create-collection")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(responseType)
                .doOnSuccess(response -> log.info("Create collection successful: {}", response))
                .doOnError(error -> log.error("Create collection failed", error));
    }

    /**
     * 代理 POST /api/vector-stores/drop-collection
     * 删除向量集合
     */
    @PostMapping("/drop-collection")
    public Mono<Map<String, Object>> dropCollection(@NonNull @RequestBody Map<String, Object> request) {
        log.info("Proxying drop-collection request to Vector Store service");
        log.debug("Drop collection request payload: {}", request);
        
        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(vectorStoreBaseUrl)).build();
        ParameterizedTypeReference<Map<String, Object>> responseType = 
                new ParameterizedTypeReference<>() {};
        
        return client.post()
                .uri("/vector-stores/drop-collection")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(responseType)
                .doOnSuccess(response -> log.info("Drop collection successful: {}", response))
                .doOnError(error -> log.error("Drop collection failed", error));
    }

    /**
     * 通用代理方法（用于其他 vector-stores 端点）
     */
    @RequestMapping(value = "/**", method = {RequestMethod.POST, RequestMethod.GET})
    public Mono<ResponseEntity<byte[]>> proxyRequest(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestHeader HttpHeaders headers,
            @NonNull HttpMethod method) {
        
        String path = "/vector-stores" + 
                     org.springframework.web.servlet.HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE;
        
        log.info("Proxying {} request to: {}", method, path);
        
        WebClient client = webClientBuilder.baseUrl(Objects.requireNonNull(vectorStoreBaseUrl)).build();
        
        WebClient.RequestHeadersSpec<?> spec;
        
        if (body != null && (method == HttpMethod.POST || method == HttpMethod.PUT)) {
            spec = client.method(method)
                    .uri(path)
                    .bodyValue(body);
        } else {
            spec = client.method(method)
                    .uri(path);
        }
        
        return spec.retrieve()
                .toEntity(byte[].class)
                .doOnError(error -> log.error("Proxy request failed", error));
    }
}
