import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Tabs,
  Typography,
  Input,
  Button,
  Radio,
  Checkbox,
  Alert,
} from "antd";
import { AiOutlineUpload } from "react-icons/ai";
import { DslParseResult } from "../types";
import { useStyles } from "../styles";

interface DslIoModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  activeTab: "export" | "import";
  onTabChange: (tab: "export" | "import") => void;
  // 导出
  exportDslText: string;
  onCopyDsl: () => void;
  onDownloadDsl: () => void;
  // 导入
  importText: string;
  onImportTextChange: (value: string) => void;
  importPreview: DslParseResult;
  applyMode: "replace" | "append";
  onApplyModeChange: (mode: "replace" | "append") => void;
  autoLayout: boolean;
  onAutoLayoutChange: (checked: boolean) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DslIoModal: React.FC<DslIoModalProps> = ({
  open,
  onCancel,
  onOk,
  activeTab,
  onTabChange,
  exportDslText,
  onCopyDsl,
  onDownloadDsl,
  importText,
  onImportTextChange,
  importPreview,
  applyMode,
  onApplyModeChange,
  autoLayout,
  onAutoLayoutChange,
  onFileChange,
}) => {
  const { styles } = useStyles();
  const { t } = useTranslation("flow");
  const { t: tCommon } = useTranslation("common");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <Modal
      title={t("dslIoModal.title")}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={
        activeTab === "import"
          ? t("dslIoModal.applyToCanvas")
          : t("dslIoModal.close")
      }
      cancelText={tCommon("action.cancel")}
      width={720}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => onTabChange(key as "export" | "import")}
        items={[
          {
            key: "export",
            label: t("dslIoModal.export"),
            children: (
              <div className={styles.dslModalBody}>
                <Typography.Text className={styles.dslHelp}>
                  {t("dslIoModal.exportHelp")}
                </Typography.Text>
                <Input.TextArea
                  className={styles.dslEditor}
                  rows={14}
                  value={exportDslText}
                  readOnly
                />
                <div className={styles.dslFooter}>
                  <Button onClick={onCopyDsl}>{t("dslIoModal.copyDsl")}</Button>
                  <Button onClick={onDownloadDsl}>
                    {t("dslIoModal.downloadDsl")}
                  </Button>
                </div>
              </div>
            ),
          },
          {
            key: "import",
            label: t("dslIoModal.import"),
            children: (
              <div className={styles.dslModalBody}>
                <Typography.Text className={styles.dslHelp}>
                  {t("dslIoModal.importHelp")}
                </Typography.Text>
                <Alert
                  type="warning"
                  showIcon
                  title={t("dslIoModal.dependencyTip")}
                  description={t("dslIoModal.dependencyDesc")}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  style={{ display: "none" }}
                  onChange={onFileChange}
                />
                <div className={styles.dslFooter}>
                  <Radio.Group
                    value={applyMode}
                    onChange={(e) => {
                      const mode = e.target.value as "replace" | "append";
                      onApplyModeChange(mode);
                    }}
                    optionType="button"
                    buttonStyle="solid"
                  >
                    <Radio.Button value="replace">
                      {t("dslIoModal.replaceCurrent")}
                    </Radio.Button>
                    <Radio.Button value="append">
                      {t("dslIoModal.appendToCurrent")}
                    </Radio.Button>
                  </Radio.Group>
                  <Checkbox
                    checked={autoLayout}
                    onChange={(e) => onAutoLayoutChange(e.target.checked)}
                  >
                    {t("dslIoModal.autoLayoutAfterApply")}
                  </Checkbox>
                  <Button icon={<AiOutlineUpload />} onClick={handlePickFile}>
                    {t("dslIoModal.selectDslFile")}
                  </Button>
                </div>
                <Input.TextArea
                  className={styles.dslEditor}
                  rows={14}
                  value={importText}
                  onChange={(e) => onImportTextChange(e.target.value)}
                  placeholder={t("dslIoModal.pasteDslJson")}
                />
                {importPreview.errors.length > 0 && (
                  <Alert
                    type="error"
                    showIcon
                    title={t("dslIoModal.validationFailed")}
                    description={importPreview.errors.join("；")}
                  />
                )}
                {importPreview.notes.length > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    title={t("dslIoModal.note")}
                    description={importPreview.notes.join("；")}
                  />
                )}
                {importPreview.dsl && importPreview.errors.length === 0 && (
                  <div className={styles.dslPreview}>
                    <Typography.Text>
                      {t("dslIoModal.nodeCount")} {importPreview.dsl.nodes.length}
                    </Typography.Text>
                    <Typography.Text>
                      {t("dslIoModal.edgeCount")}{" "}
                      {importPreview.dsl.edges?.length || 0}
                    </Typography.Text>
                    <Typography.Text>
                      {t("dslIoModal.nodeTypes")}{" "}
                      {Array.from(
                        new Set(importPreview.dsl.nodes.map((node) => node.type))
                      ).join(", ")}
                    </Typography.Text>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};
