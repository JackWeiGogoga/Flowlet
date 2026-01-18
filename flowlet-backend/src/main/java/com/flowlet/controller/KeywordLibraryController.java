package com.flowlet.controller;

import com.flowlet.dto.Result;
import com.flowlet.dto.keyword.KeywordGroupRequest;
import com.flowlet.dto.keyword.KeywordGroupResponse;
import com.flowlet.dto.keyword.KeywordLibraryRequest;
import com.flowlet.dto.keyword.KeywordLibraryResponse;
import com.flowlet.dto.keyword.KeywordTermRequest;
import com.flowlet.dto.keyword.KeywordTermResponse;
import com.flowlet.service.KeywordLibraryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/**
 * 关键词库管理控制器
 */
@RestController
@RequestMapping("/api/projects/{projectId}/keyword-libraries")
@RequiredArgsConstructor
public class KeywordLibraryController {

    private final KeywordLibraryService keywordLibraryService;

    @GetMapping
    public Result<List<KeywordLibraryResponse>> list(@PathVariable String projectId,
                                                     @RequestParam(required = false) String keyword) {
        return Result.success(keywordLibraryService.listLibraries(projectId, keyword));
    }

    @PostMapping
    public Result<KeywordLibraryResponse> create(@PathVariable String projectId,
                                                 @RequestBody KeywordLibraryRequest request,
                                                 Principal principal) {
        String userId = principal != null ? principal.getName() : "anonymous";
        return Result.success(keywordLibraryService.createLibrary(projectId, request, userId));
    }

    @PutMapping("/{id}")
    public Result<KeywordLibraryResponse> update(@PathVariable String projectId,
                                                 @PathVariable String id,
                                                 @RequestBody KeywordLibraryRequest request) {
        return Result.success(keywordLibraryService.updateLibrary(id, projectId, request));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String projectId, @PathVariable String id) {
        keywordLibraryService.deleteLibrary(id);
        return Result.success(null);
    }

    @GetMapping("/{libraryId}/terms")
    public Result<List<KeywordTermResponse>> listTerms(@PathVariable String projectId,
                                                       @PathVariable String libraryId,
                                                       @RequestParam(required = false) String keyword) {
        return Result.success(keywordLibraryService.listTerms(libraryId, keyword));
    }

    @PostMapping("/{libraryId}/terms")
    public Result<KeywordTermResponse> createTerm(@PathVariable String projectId,
                                                  @PathVariable String libraryId,
                                                  @RequestBody KeywordTermRequest request,
                                                  Principal principal) {
        String userId = principal != null ? principal.getName() : "anonymous";
        return Result.success(keywordLibraryService.createTerm(libraryId, request, userId));
    }

    @PutMapping("/{libraryId}/terms/{id}")
    public Result<KeywordTermResponse> updateTerm(@PathVariable String projectId,
                                                  @PathVariable String libraryId,
                                                  @PathVariable String id,
                                                  @RequestBody KeywordTermRequest request) {
        return Result.success(keywordLibraryService.updateTerm(libraryId, id, request));
    }

    @DeleteMapping("/{libraryId}/terms/{id}")
    public Result<Void> deleteTerm(@PathVariable String projectId,
                                   @PathVariable String libraryId,
                                   @PathVariable String id) {
        keywordLibraryService.deleteTerm(libraryId, id);
        return Result.success(null);
    }

    @GetMapping("/{libraryId}/groups")
    public Result<List<KeywordGroupResponse>> listGroups(@PathVariable String projectId,
                                                         @PathVariable String libraryId,
                                                         @RequestParam(required = false) String keyword) {
        return Result.success(keywordLibraryService.listGroups(libraryId, keyword));
    }

    @PostMapping("/{libraryId}/groups")
    public Result<KeywordGroupResponse> createGroup(@PathVariable String projectId,
                                                    @PathVariable String libraryId,
                                                    @RequestBody KeywordGroupRequest request,
                                                    Principal principal) {
        String userId = principal != null ? principal.getName() : "anonymous";
        return Result.success(keywordLibraryService.createGroup(libraryId, request, userId));
    }

    @PutMapping("/{libraryId}/groups/{id}")
    public Result<KeywordGroupResponse> updateGroup(@PathVariable String projectId,
                                                    @PathVariable String libraryId,
                                                    @PathVariable String id,
                                                    @RequestBody KeywordGroupRequest request) {
        return Result.success(keywordLibraryService.updateGroup(libraryId, id, request));
    }

    @DeleteMapping("/{libraryId}/groups/{id}")
    public Result<Void> deleteGroup(@PathVariable String projectId,
                                    @PathVariable String libraryId,
                                    @PathVariable String id) {
        keywordLibraryService.deleteGroup(libraryId, id);
        return Result.success(null);
    }
}
