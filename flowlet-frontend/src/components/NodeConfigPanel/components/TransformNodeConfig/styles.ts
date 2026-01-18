import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => ({
  config: css`
    padding: 0;
  `,

  // 映射模式
  mappingMode: css`
    width: 100%;
  `,

  // 映射容器
  mappingContainer: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,

  // 操作按钮
  mappingActions: css`
    display: flex;
    gap: 8px;
  `,

  // 映射分组
  mappingGroups: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,

  mappingGroup: css`
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  `,

  mappingGroupHeader: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
  `,

  mappingCount: css`
    font-size: 12px;
    color: #999;
  `,

  mappingGroupContent: css`
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,

  // 映射行 - 紧凑布局
  mappingRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: #fafafa;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      background: #f0f7ff;
    }
  `,

  mappingRowSource: css`
    flex: 1;
    min-width: 0;

    .ant-select {
      width: 100%;
    }

    .ant-input {
      font-size: 12px;
    }
  `,

  mappingRowArrow: css`
    color: #1890ff;
    font-weight: bold;
    font-size: 14px;
    flex-shrink: 0;
  `,

  mappingRowTarget: css`
    flex: 1;
    min-width: 0;

    .ant-input {
      font-size: 12px;
    }
  `,

  mappingRowRegexMode: css`
    width: 110px;
    flex-shrink: 0;

    .ant-select {
      width: 100%;
    }
  `,

  mappingRowDelete: css`
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.2s;
  `,

  mappingRowDeleteVisible: css`
    opacity: 1;
  `,

  // 待配置的映射行
  mappingRowUngrouped: css`
    background: #fffbe6;

    &:hover {
      background: #fff7cc;
    }
  `,

  mappingRowNode: css`
    flex: 1;
    min-width: 0;
  `,

  // 未分组的分组样式
  mappingGroupUngrouped: css`
    border-color: #faad14;
    border-style: dashed;
  `,

  mappingGroupUngroupedHeader: css`
    background: #fffbe6;
  `,

  mappingRegexRow: css`
    display: flex;
    gap: 8px;
    padding: 4px 8px 6px;
    background: #fff;
    border-radius: 6px;
  `,

  mappingRegexField: css`
    flex: 1;
    min-width: 0;
  `,

  mappingRegexFlags: css`
    width: 80px;
    flex-shrink: 0;
  `,

  mappingRegexReplace: css`
    flex: 1;
    min-width: 0;
  `,

  mappingRegexGroup: css`
    width: 110px;
    flex-shrink: 0;
  `,

  // 高级模式
  advancedMode: css`
    width: 100%;
  `,

  // 预览区域
  previewSection: css`
    margin-top: 16px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    overflow: hidden;
  `,

  previewHeader: css`
    background: #fafafa;
    padding: 8px 12px;
    font-weight: 500;
    font-size: 13px;
    border-bottom: 1px solid #e8e8e8;
    color: #666;
  `,

  previewContent: css`
    margin: 0;
    padding: 12px;
    background: #fff;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    font-size: 12px;
    line-height: 1.6;
    color: #2c3e50;
    max-height: 300px;
    overflow: auto;
  `,

  // 树形选择器样式优化
  treeStyles: css`
    .ant-tree {
      font-size: 13px;
    }

    .ant-tree .ant-tree-node-content-wrapper {
      user-select: none;
    }

    .ant-tree .ant-tree-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `,

  // 响应式
  mappingItemContent: css`
    @media (max-width: 768px) {
      gap: 12px;
    }
  `,

  mappingArrow: css`
    @media (max-width: 768px) {
      transform: rotate(90deg);
    }
  `,
}));
