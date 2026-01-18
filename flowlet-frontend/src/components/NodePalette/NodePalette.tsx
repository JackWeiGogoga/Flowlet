import React, { useMemo } from "react";
import { Typography } from "antd";
import { createStyles } from "antd-style";
import { useTranslation } from "react-i18next";
import { NodeType } from "@/types";
import { getNodeTypes, NodeTypeConfig } from "@/config/nodeTypes";
import ResizablePanel from "../ResizablePanel";

const { Text } = Typography;

const useStyles = createStyles(({ css }) => ({
  palette: css`
    width: 220px;
    height: 100%;
    overflow-y: auto;
  `,

  content: css`
    padding: 12px;
  `,

  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,

  item: css`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    cursor: grab;
    transition: all 0.2s ease;
    border-left-width: 3px;

    &:hover {
      background: #fafafa;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    &:active {
      cursor: grabbing;
    }
  `,

  itemIcon: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    color: #fff;
    font-size: 16px;
    flex-shrink: 0;
  `,

  itemInfo: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  `,

  itemLabel: css`
    font-size: 13px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,

  itemDesc: css`
    font-size: 11px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
}));

interface NodePaletteProps {
  onDragStart?: (event: React.DragEvent, nodeType: NodeType) => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart }) => {
  const { styles } = useStyles();
  const { t } = useTranslation("common");

  // Get node types with reactive language switching
  const nodeTypes = useMemo(() => getNodeTypes(), [t]);

  const handleDragStart = (event: React.DragEvent, item: NodeTypeConfig) => {
    event.dataTransfer.setData("application/reactflow", item.type);
    event.dataTransfer.setData("nodeLabel", item.label);
    event.dataTransfer.effectAllowed = "move";
    onDragStart?.(event, item.type);
  };

  return (
    <ResizablePanel
      title={t("nodeTypes.panelTitle", "Node Palette")}
      position="left"
      defaultWidth={220}
      minWidth={180}
      maxWidth={350}
      defaultCollapsed={true}
    >
      <div className={styles.content}>
        <div className={styles.list}>
          {nodeTypes.map((item) => (
            <div
              key={item.type}
              className={styles.item}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              style={{ borderColor: item.color }}
            >
              <div
                className={styles.itemIcon}
                style={{ backgroundColor: item.color }}
              >
                {item.icon}
              </div>
              <div className={styles.itemInfo}>
                <Text strong className={styles.itemLabel}>
                  {item.label}
                </Text>
                <Text type="secondary" className={styles.itemDesc}>
                  {item.description}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ResizablePanel>
  );
};

export default NodePalette;
