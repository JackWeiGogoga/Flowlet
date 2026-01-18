import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  Select,
  Tooltip,
  Popconfirm,
  Dropdown,
  Spin,
  Empty,
  Tag,
} from "antd";
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiMoreVertical,
  FiGlobe,
  FiLayers,
  FiArrowUp,
  FiCopy,
} from "react-icons/fi";
import { message } from "@/components/AppMessageContext/staticMethods";
import dataStructureService, {
  type DataStructureResponse,
} from "@/services/dataStructureService";
import { useFlowStore } from "@/store/flowStore";
import { DataStructureDrawer } from "./DataStructureDrawer";
import { useStyles } from "./DataStructureManager.style";

interface DataStructureManagerProps {
  projectId: string;
  flowId?: string; // 当前流程 ID（如果在流程编辑器中使用）
  flows?: { id: string; name: string }[]; // 流程列表
  onSelect?: (structure: DataStructureResponse) => void;
  compact?: boolean; // 紧凑模式（用于侧边栏）
}

export const DataStructureManager: React.FC<DataStructureManagerProps> = ({
  projectId,
  flowId,
  flows = [],
  onSelect,
  compact = false,
}) => {
  const { t } = useTranslation("dictionary");
  const { t: tCommon } = useTranslation("common");
  const { styles } = useStyles();
  const { dataStructures: storeStructures, setDataStructures } = useFlowStore();
  const [structures, setStructures] = useState<
    Record<string, DataStructureResponse[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStructure, setEditingStructure] =
    useState<DataStructureResponse | null>(null);

  const loadStructures = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const grouped = await dataStructureService.getAllGrouped(projectId);
      setStructures(grouped);
      setDataStructures(Object.values(grouped).flat());
    } catch (error) {
      console.error("加载数据结构失败:", error);
      message.error(t("dataStructure.message.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [projectId, setDataStructures, t]);

  useEffect(() => {
    loadStructures();
  }, [loadStructures]);

  useEffect(() => {
    if (!storeStructures || storeStructures.length === 0) return;
    const grouped: Record<string, DataStructureResponse[]> = {};
    storeStructures.forEach((structure) => {
      const key = structure.flowId
        ? structure.flowName || structure.flowId
        : "global";
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(structure);
    });
    setStructures(grouped);
  }, [storeStructures]);

  const handleCreate = () => {
    setEditingStructure(null);
    setDrawerOpen(true);
  };

  const handleEdit = (structure: DataStructureResponse) => {
    setEditingStructure(structure);
    setDrawerOpen(true);
  };

  const handleDelete = async (structure: DataStructureResponse) => {
    try {
      await dataStructureService.delete(projectId, structure.id);
      message.success(t("dataStructure.message.deleteSuccess"));
      loadStructures();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("dataStructure.message.deleteFailed");
      message.error(errorMessage);
    }
  };

  const handlePromote = async (structure: DataStructureResponse) => {
    try {
      await dataStructureService.promoteToProjectLevel(projectId, structure.id);
      message.success(t("dataStructure.message.promoteSuccess"));
      loadStructures();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("dataStructure.message.promoteFailed");
      message.error(errorMessage);
    }
  };

  const handleCopy = async (structure: DataStructureResponse) => {
    try {
      await dataStructureService.copyTo(
        projectId,
        structure.id,
        flowId || null,
        `${structure.name}_copy`
      );
      message.success(t("dataStructure.message.copySuccess"));
      loadStructures();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("dataStructure.message.copyFailed");
      message.error(errorMessage);
    }
  };

  const handleSaved = () => {
    loadStructures();
  };

  // 过滤结构
  const filteredStructures = React.useMemo(() => {
    const result: Record<string, DataStructureResponse[]> = {};

    Object.entries(structures).forEach(([scope, list]) => {
      // 作用域过滤
      if (scopeFilter !== "all") {
        if (scopeFilter === "global" && scope !== "global") return;
        if (scopeFilter === "flow" && scope === "global") return;
      }

      // 搜索过滤
      const filtered = list.filter(
        (s) =>
          s.name.toLowerCase().includes(searchText.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchText.toLowerCase())
      );

      if (filtered.length > 0) {
        result[scope] = filtered;
      }
    });

    return result;
  }, [structures, scopeFilter, searchText]);

  const getMoreMenuItems = (structure: DataStructureResponse) => {
    const items = [
      {
        key: "copy",
        icon: <FiCopy />,
        label: t("dataStructure.copy"),
        onClick: () => handleCopy(structure),
      },
    ];

    // 只有流程级结构才能提升
    if (structure.flowId) {
      items.push({
        key: "promote",
        icon: <FiArrowUp />,
        label: t("dataStructure.promoteToProject"),
        onClick: () => handlePromote(structure),
      });
    }

    return items;
  };

  const totalCount = Object.values(structures).reduce(
    (sum, list) => sum + list.length,
    0
  );

  const allStructures = React.useMemo(
    () => Object.values(structures).flat(),
    [structures]
  );

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <h3 className={styles.title}>{t("dataStructure.title")}</h3>
        <Button
          type="primary"
          size={compact ? "small" : "middle"}
          icon={<FiPlus />}
          onClick={handleCreate}
        >
          {compact ? "" : t("dataStructure.create")}
        </Button>
      </div>

      {/* 搜索和过滤 */}
      <div className={styles.searchRow}>
        <Input
          placeholder={t("dataStructure.searchPlaceholder")}
          prefix={<FiSearch />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ flex: 1 }}
        />
        <Select
          value={scopeFilter}
          onChange={setScopeFilter}
          style={{ width: 120 }}
          options={[
            { value: "all", label: t("dataStructure.scopeAll") },
            { value: "global", label: t("dataStructure.scopeProject") },
            { value: "flow", label: t("dataStructure.scopeFlow") },
          ]}
        />
      </div>

      {/* 列表 */}
      <Spin spinning={loading}>
        <div className={styles.listContainer}>
          {totalCount === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("dataStructure.empty")}
            />
          ) : (
            Object.entries(filteredStructures).map(([scope, list]) => (
              <div key={scope} className={styles.scopeGroup}>
                <div className={styles.scopeTitle}>
                  {scope === "global" ? (
                    <>
                      <FiGlobe />
                      <span>{t("dataStructure.projectLevel")}</span>
                    </>
                  ) : (
                    <>
                      <FiLayers />
                      <span>{scope}</span>
                    </>
                  )}
                  <span className={styles.badge}>{list.length}</span>
                </div>

                {list.map((structure) => (
                  <div
                    key={structure.id}
                    className={styles.structureCard}
                    onClick={() => onSelect?.(structure)}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.cardName}>
                        {structure.fullName || structure.name}
                        {structure.isGeneric && (
                          <Tag
                            color="blue"
                            style={{ marginLeft: 6, fontSize: 10 }}
                          >
                            {t("dataStructure.generic")}
                          </Tag>
                        )}
                      </span>
                      <div
                        className={styles.cardActions}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip title={t("dataStructure.edit")}>
                          <Button
                            type="text"
                            size="small"
                            icon={<FiEdit2 />}
                            onClick={() => handleEdit(structure)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title={t("dataStructure.confirm.delete")}
                          description={
                            structure.usageCount > 0
                              ? t("dataStructure.confirm.deleteWithUsage", { count: structure.usageCount })
                              : undefined
                          }
                          onConfirm={() => handleDelete(structure)}
                          okText={tCommon("delete")}
                          cancelText={tCommon("cancel")}
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<FiTrash2 />}
                          />
                        </Popconfirm>
                        <Dropdown
                          menu={{ items: getMoreMenuItems(structure) }}
                          trigger={["click"]}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<FiMoreVertical />}
                          />
                        </Dropdown>
                      </div>
                    </div>
                    {structure.description && (
                      <div className={styles.cardDesc}>
                        {structure.description}
                      </div>
                    )}
                    <div className={styles.cardMeta}>
                      <span>{t("dataStructure.fieldsCount", { count: structure.fields?.length || 0 })}</span>
                      {structure.usageCount > 0 && (
                        <span>{t("dataStructure.usageCount", { count: structure.usageCount })}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </Spin>

      {/* 编辑抽屉 */}
      <DataStructureDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        projectId={projectId}
        flowId={flowId}
        editingStructure={editingStructure}
        flows={flows}
        dataStructures={allStructures}
      />
    </div>
  );
};
