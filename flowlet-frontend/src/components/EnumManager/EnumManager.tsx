import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Popconfirm, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import dayjs from "dayjs";
import { message } from "@/components/AppMessageContext/staticMethods";
import enumService, { type EnumDefinition } from "@/services/enumService";
import { EnumDrawer } from "./EnumDrawer";
import { useStyles } from "./EnumManager.style";

interface EnumManagerProps {
  projectId: string;
}

const formatTime = (value?: string) => {
  if (!value) {
    return "-";
  }
  return dayjs(value).format("YYYY-MM-DD HH:mm");
};

export const EnumManager: React.FC<EnumManagerProps> = ({ projectId }) => {
  const { t } = useTranslation("dictionary");
  const { t: tCommon } = useTranslation("common");
  const { styles } = useStyles();
  const [loading, setLoading] = useState(false);
  const [enums, setEnums] = useState<EnumDefinition[]>([]);
  const [searchText, setSearchText] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEnum, setEditingEnum] = useState<EnumDefinition | null>(null);

  const loadEnums = useCallback(async () => {
    if (!projectId) {
      return;
    }
    setLoading(true);
    try {
      const data = await enumService.list(projectId);
      setEnums(data);
    } catch {
      message.error(t("enum.message.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    loadEnums();
  }, [loadEnums]);

  const filteredEnums = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return enums;
    }
    return enums.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword)
    );
  }, [enums, searchText]);

  const handleCreate = () => {
    setEditingEnum(null);
    setDrawerOpen(true);
  };

  const handleEdit = (record: EnumDefinition) => {
    setEditingEnum(record);
    setDrawerOpen(true);
  };

  const handleDelete = async (record: EnumDefinition) => {
    try {
      await enumService.remove(projectId, record.id);
      message.success(t("enum.message.deleteSuccess"));
      loadEnums();
    } catch {
      message.error(t("enum.message.deleteFailed"));
    }
  };

  const columns: ColumnsType<EnumDefinition> = useMemo(() => [
    {
      title: t("enum.columns.name"),
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: t("enum.columns.description"),
      dataIndex: "description",
      key: "description",
      render: (value?: string) => value || "-",
    },
    {
      title: t("enum.columns.values"),
      dataIndex: "values",
      key: "values",
      render: (values: EnumDefinition["values"]) => {
        if (!values || values.length === 0) {
          return "-";
        }
        const visible = values.slice(0, 4);
        const remaining = values.length - visible.length;
        return (
          <div>
            {visible.map((item) => (
              <Tag key={item.value} className={styles.valueTag}>
                {item.label || item.value}
              </Tag>
            ))}
            {remaining > 0 && <Tag>+{remaining}</Tag>}
          </div>
        );
      },
    },
    {
      title: t("enum.columns.updatedAt"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value?: string) => formatTime(value),
    },
    {
      title: t("enum.columns.actions"),
      key: "actions",
      width: 120,
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Tooltip title={t("enum.edit")}>
            <Button
              type="text"
              size="small"
              icon={<FiEdit2 />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title={t("enum.confirm.delete")}
            onConfirm={() => handleDelete(record)}
            okText={tCommon("delete")}
            cancelText={tCommon("cancel")}
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<FiTrash2 />} />
          </Popconfirm>
        </div>
      ),
    },
  ], [t, tCommon, styles.valueTag]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t("enum.title")}</h3>
        <Button type="primary" icon={<FiPlus />} onClick={handleCreate}>
          {t("enum.create")}
        </Button>
      </div>

      <div className={styles.searchRow}>
        <Input
          placeholder={t("enum.searchPlaceholder")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <div className={styles.tableWrapper}>
        <Table
          columns={columns}
          dataSource={filteredEnums}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
        />
      </div>

      <EnumDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        editingEnum={editingEnum}
        onSaved={loadEnums}
      />
    </div>
  );
};
