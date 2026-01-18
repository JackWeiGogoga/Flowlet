package com.flowlet.controller;

import com.flowlet.dto.Result;
import com.flowlet.dto.vectorstore.VectorStoreProviderRequest;
import com.flowlet.dto.vectorstore.VectorStoreProviderResponse;
import com.flowlet.service.VectorStoreProviderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 向量存储配置管理 API (管理员)
 */
@RestController
@RequestMapping("/api/admin/vector-stores")
@RequiredArgsConstructor
public class VectorStoreProviderController {

    private final VectorStoreProviderService vectorStoreProviderService;

    @GetMapping
    public Result<List<VectorStoreProviderResponse>> listProviders() {
        return Result.success(vectorStoreProviderService.listProviders());
    }

    @PostMapping
    public Result<VectorStoreProviderResponse> createProvider(
            @Valid @RequestBody VectorStoreProviderRequest request) {
        return Result.success(vectorStoreProviderService.createProvider(request));
    }

    @PutMapping("/{id}")
    public Result<VectorStoreProviderResponse> updateProvider(
            @PathVariable String id,
            @Valid @RequestBody VectorStoreProviderRequest request) {
        return Result.success(vectorStoreProviderService.updateProvider(id, request));
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteProvider(@PathVariable String id) {
        vectorStoreProviderService.deleteProvider(id);
        return Result.success();
    }

    @PostMapping("/{id}/toggle")
    public Result<VectorStoreProviderResponse> toggleProvider(
            @PathVariable String id,
            @RequestParam("enabled") boolean enabled) {
        return Result.success(vectorStoreProviderService.toggleProvider(id, enabled));
    }
}
