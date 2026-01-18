import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, Typography, Select, Input } from "antd";
import { FlowDefinitionVersion } from "@/types";
import { useStyles } from "../styles";

interface ExecuteModalProps {
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
  loading: boolean;
  executeInput: string;
  onInputChange: (value: string) => void;
  executeVersion?: number;
  onVersionChange: (value: number | undefined) => void;
  versions: FlowDefinitionVersion[];
}

export const ExecuteModal: React.FC<ExecuteModalProps> = ({
  open,
  onOk,
  onCancel,
  loading,
  executeInput,
  onInputChange,
  executeVersion,
  onVersionChange,
  versions,
}) => {
  const { styles } = useStyles();
  const { t } = useTranslation("flow");
  const { t: tCommon } = useTranslation("common");

  return (
    <Modal
      title={t("executeModal.title")}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={t("editor.execute")}
      cancelText={tCommon("action.cancel")}
    >
      <div className={styles.executeModalContent}>
        <Typography.Text>{t("executeModal.version")}</Typography.Text>
        <Select
          style={{ width: "100%", marginTop: 8, marginBottom: 16 }}
          value={executeVersion ?? "latest"}
          onChange={(value) => {
            if (value === "latest") {
              onVersionChange(undefined);
            } else {
              onVersionChange(value as number);
            }
          }}
          options={[
            { label: t("executeModal.latestPublished"), value: "latest" },
            ...versions.map((version) => ({
              label: `v${version.version}`,
              value: version.version,
            })),
          ]}
        />
        <Typography.Text>{t("executeModal.inputParams")}</Typography.Text>
        <Input.TextArea
          rows={6}
          value={executeInput}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={t("executeModal.inputPlaceholder")}
        />
      </div>
    </Modal>
  );
};
