import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, Table, Button, Empty } from "antd";
import { FlowDefinitionVersion } from "@/types";

interface VersionModalProps {
  open: boolean;
  onCancel: () => void;
  loading: boolean;
  versions: FlowDefinitionVersion[];
  onRollback: (version: number) => void;
}

export const VersionModal: React.FC<VersionModalProps> = ({
  open,
  onCancel,
  loading,
  versions,
  onRollback,
}) => {
  const { t } = useTranslation("flow");

  return (
    <Modal
      title={t("versionModal.title")}
      open={open}
      onCancel={onCancel}
      footer={null}
    >
      <Table
        size="small"
        loading={loading}
        dataSource={versions}
        rowKey="id"
        pagination={false}
        columns={[
          {
            title: t("versionModal.version"),
            dataIndex: "version",
            width: 90,
            render: (value: number) => `v${value}`,
          },
          {
            title: t("versionModal.publishedAt"),
            dataIndex: "createdAt",
            width: 180,
          },
          {
            title: t("versionModal.publishedBy"),
            dataIndex: "createdByName",
            width: 140,
            render: (_: unknown, record: FlowDefinitionVersion) =>
              record.createdByName || record.createdBy || "-",
          },
          {
            title: t("versionModal.actions"),
            key: "actions",
            render: (_: unknown, record: FlowDefinitionVersion) => (
              <Button size="small" onClick={() => onRollback(record.version)}>
                {t("versionModal.editFromVersion")}
              </Button>
            ),
          },
        ]}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("versionModal.noVersions")}
            />
          ),
        }}
      />
    </Modal>
  );
};
