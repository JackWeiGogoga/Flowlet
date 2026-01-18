package com.flowlet.controller;

import com.flowlet.dto.Result;
import com.flowlet.dto.model.CustomProviderRequest;
import com.flowlet.dto.model.CustomProviderResponse;
import com.flowlet.dto.model.ModelProviderListResponse;
import com.flowlet.dto.model.ModelProviderTestRequest;
import com.flowlet.dto.model.ModelProviderTestResponse;
import com.flowlet.dto.model.StandardProviderResponse;
import com.flowlet.dto.model.StandardProviderModelCatalogResponse;
import com.flowlet.dto.model.StandardProviderModelRefreshRequest;
import com.flowlet.dto.model.UpsertStandardProviderRequest;
import com.flowlet.service.ModelProviderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 模型配置管理 API (管理员)
 */
@RestController
@RequestMapping("/api/admin/model-providers")
@RequiredArgsConstructor
public class ModelProviderController {

    private final ModelProviderService modelProviderService;

    @GetMapping
    public Result<ModelProviderListResponse> listProviders() {
        return Result.success(modelProviderService.listProviders());
    }

    @PostMapping("/standard/{providerKey}")
    public Result<StandardProviderResponse> upsertStandard(
            @PathVariable String providerKey,
            @Valid @RequestBody UpsertStandardProviderRequest request) {
        return Result.success(modelProviderService.upsertStandard(providerKey, request));
    }

    @DeleteMapping("/standard/{providerKey}")
    public Result<Void> deleteStandard(@PathVariable String providerKey) {
        modelProviderService.deleteStandard(providerKey);
        return Result.success();
    }

    @PostMapping("/custom")
    public Result<CustomProviderResponse> createCustom(
            @Valid @RequestBody CustomProviderRequest request) {
        return Result.success(modelProviderService.createCustom(request));
    }

    @PutMapping("/custom/{id}")
    public Result<CustomProviderResponse> updateCustom(
            @PathVariable String id,
            @Valid @RequestBody CustomProviderRequest request) {
        return Result.success(modelProviderService.updateCustom(id, request));
    }

    @DeleteMapping("/custom/{id}")
    public Result<Void> deleteCustom(@PathVariable String id) {
        modelProviderService.deleteCustom(id);
        return Result.success();
    }

    @PostMapping("/custom/{id}/toggle")
    public Result<CustomProviderResponse> toggleCustom(
            @PathVariable String id,
            @RequestParam("enabled") boolean enabled) {
        return Result.success(modelProviderService.toggleCustom(id, enabled));
    }

    @PostMapping("/test")
    public Result<ModelProviderTestResponse> testConnection(
            @Valid @RequestBody ModelProviderTestRequest request) {
        return Result.success(modelProviderService.testConnection(request));
    }

    @PostMapping("/standard/{providerKey}/models/refresh")
    public Result<StandardProviderModelCatalogResponse> refreshStandardModels(
            @PathVariable String providerKey,
            @RequestBody StandardProviderModelRefreshRequest request) {
        return Result.success(modelProviderService.refreshStandardModels(providerKey, request));
    }
}
