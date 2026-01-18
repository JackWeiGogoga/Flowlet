import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  Select,
  Tooltip,
  Popconfirm,
  Spin,
  Empty,
  Tag,
} from "antd";
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiGlobe,
  FiLayers,
} from "react-icons/fi";
import { message } from "@/components/AppMessageContext/staticMethods";
import constantService, {
  type ConstantDefinitionResponse,
} from "@/services/constantService";
import { useFlowStore } from "@/store/flowStore";
import { ConstantDrawer } from "./ConstantDrawer";
import { useStyles } from "./ConstantManager.style";

interface ConstantManagerProps {
  projectId: string;
  flowId?: string;
  flows?: { id: string; name: string }[];
}

const formatValue = (constant: ConstantDefinitionResponse) => {
  if (constant.value === undefined) {
    return "-";
  }
  if (typeof constant.value === "string") {
    return constant.value;
  }
  try {
    return JSON.stringify(constant.value);
  } catch {
    return String(constant.value);
  }
};

export const ConstantManager: React.FC<ConstantManagerProps> = ({
  projectId,
  flowId,
  flows = [],
}) => {
  const { t } = useTranslation("dictionary");
  const { t: tCommon } = useTranslation("common");
  const { styles } = useStyles();
  const { setConstants } = useFlowStore();
  const [constants, setLocalConstants] = useState<
    Record<string, ConstantDefinitionResponse[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingConstant, setEditingConstant] =
    useState<ConstantDefinitionResponse | null>(null);

  const loadConstants = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const grouped = await constantService.getAllGrouped(projectId);
      setLocalConstants(grouped);
      setConstants(Object.values(grouped).flat());
    } catch (error) {
      console.error("加载常量失败:", error);
      message.error(t("constant.message.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [projectId, setConstants, t]);

  useEffect(() => {
    loadConstants();
  }, [loadConstants]);

  const filteredConstants = useMemo(() => {
    const result: Record<string, ConstantDefinitionResponse[]> = {};
    Object.entries(constants).forEach(([scope, list]) => {
      if (scopeFilter !== "all") {
        if (scopeFilter === "global" && scope !== "global") return;
        if (scopeFilter === "flow" && scope === "global") return;
      }
      const filtered = list.filter(
        (item) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchText.toLowerCase())
      );
      if (filtered.length > 0) {
        result[scope] = filtered;
      }
    });
    return result;
  }, [constants, scopeFilter, searchText]);

  const totalCount = useMemo(
    () => Object.values(constants).reduce((sum, list) => sum + list.length, 0),
    [constants]
  );

  const handleCreate = () => {
    setEditingConstant(null);
    setDrawerOpen(true);
  };

  const handleEdit = (constant: ConstantDefinitionResponse) => {
    setEditingConstant(constant);
    setDrawerOpen(true);
  };

  const handleDelete = async (constant: ConstantDefinitionResponse) => {
    try {
      await constantService.delete(projectId, constant.id);
      message.success(t("constant.message.deleteSuccess"));
      loadConstants();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("constant.message.deleteFailed");
      message.error(errorMessage);
    }
  };

  const handleSaved = () => {
    loadConstants();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t("constant.title")}</h3>
        <Button type="primary" icon={<FiPlus />} onClick={handleCreate}>
          {t("constant.create")}
        </Button>
      </div>

      <div className={styles.searchRow}>
        <Input
          placeholder={t("constant.searchPlaceholder")}
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
            { value: "all", label: t("constant.scopeAll") },
            { value: "global", label: t("constant.scopeProject") },
            { value: "flow", label: t("constant.scopeFlow") },
          ]}
        />
      </div>

      <Spin spinning={loading}>
        <div className={styles.listContainer}>
          {totalCount === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("constant.empty")}
            />
          ) : (
            Object.entries(filteredConstants).map(([scope, list]) => (
              <div key={scope} className={styles.scopeGroup}>
                <div className={styles.scopeTitle}>
                  {scope === "global" ? (
                    <>
                      <FiGlobe />
                      <span>{t("constant.projectLevel")}</span>
                    </>
                  ) : (
                    <>
                      <FiLayers />
                      <span>{scope}</span>
                    </>
                  )}
                  <span className={styles.badge}>{list.length}</span>
                </div>

                {list.map((constant) => (
                  <div key={constant.id} className={styles.constantCard}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardName}>
                        {constant.name}
                        <Tag style={{ marginLeft: 6 }} color="blue">
                          {constant.valueType}
                        </Tag>
                      </span>
                      <div className={styles.cardActions}>
                        <Tooltip title={t("constant.edit")}>
                          <Button
                            type="text"
                            size="small"
                            icon={<FiEdit2 />}
                            onClick={() => handleEdit(constant)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title={t("constant.confirm.delete")}
                          onConfirm={() => handleDelete(constant)}
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
                      </div>
                    </div>
                    {constant.description && (
                      <div className={styles.cardDesc}>
                        {constant.description}
                      </div>
                    )}
                    <div className={styles.cardValue}>
                      {formatValue(constant)}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </Spin>

      <ConstantDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        projectId={projectId}
        flowId={flowId}
        flows={flows}
        editingConstant={editingConstant}
      />
    </div>
  );
};
