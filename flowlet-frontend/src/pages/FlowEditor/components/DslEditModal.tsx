import React from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Tabs,
  Typography,
  Input,
  Radio,
  Checkbox,
  Alert,
} from "antd";
import { DslParseResult } from "../types";
import { useStyles } from "../styles";

interface DslEditModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  // DSL
  dslText: string;
  onDslTextChange: (value: string) => void;
  dslPreview: DslParseResult;
  // 需求
  requirement: string;
  onRequirementChange: (value: string) => void;
  // 选项
  applyMode: "replace" | "append";
  onApplyModeChange: (mode: "replace" | "append") => void;
  autoLayout: boolean;
  onAutoLayoutChange: (checked: boolean) => void;
}

export const DslEditModal: React.FC<DslEditModalProps> = ({
  open,
  onCancel,
  onOk,
  dslText,
  onDslTextChange,
  dslPreview,
  requirement,
  onRequirementChange,
  applyMode,
  onApplyModeChange,
  autoLayout,
  onAutoLayoutChange,
}) => {
  const { styles } = useStyles();
  const { t } = useTranslation("flow");
  const { t: tCommon } = useTranslation("common");

  return (
    <Modal
      title={t("dslModal.title")}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={t("dslModal.applyToCanvas")}
      cancelText={tCommon("action.cancel")}
      width={720}
    >
      <div className={styles.dslModalBody}>
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
              {t("dslModal.replaceCurrent")}
            </Radio.Button>
            <Radio.Button value="append">
              {t("dslModal.appendToCurrent")}
            </Radio.Button>
          </Radio.Group>
          <Checkbox
            checked={autoLayout}
            onChange={(e) => onAutoLayoutChange(e.target.checked)}
          >
            {t("dslModal.autoLayoutAfterApply")}
          </Checkbox>
        </div>

        <Tabs
          items={[
            {
              key: "requirement",
              label: t("dslModal.requirementTab"),
              children: (
                <div className={styles.dslModalBody}>
                  <Typography.Text className={styles.dslHelp}>
                    {t("dslModal.requirementHelp")}
                  </Typography.Text>
                  <Input.TextArea
                    rows={6}
                    value={requirement}
                    onChange={(e) => onRequirementChange(e.target.value)}
                    placeholder={t("dslModal.requirementPlaceholder")}
                  />
                </div>
              ),
            },
            {
              key: "dsl",
              label: t("dslModal.dslTab"),
              children: (
                <div className={styles.dslModalBody}>
                  <Typography.Text className={styles.dslHelp}>
                    {t("dslModal.dslHelp")}
                  </Typography.Text>
                  <Input.TextArea
                    className={styles.dslEditor}
                    rows={14}
                    value={dslText}
                    onChange={(e) => onDslTextChange(e.target.value)}
                  />
                  {dslPreview.errors.length > 0 && (
                    <Alert
                      type="error"
                      showIcon
                      title={t("dslModal.validationFailed")}
                      description={dslPreview.errors.join("；")}
                    />
                  )}
                  {dslPreview.notes.length > 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      title={t("dslModal.note")}
                      description={dslPreview.notes.join("；")}
                    />
                  )}
                  {dslPreview.dsl && dslPreview.errors.length === 0 && (
                    <div className={styles.dslPreview}>
                      <Typography.Text>
                        {t("dslModal.nodeCount")} {dslPreview.dsl.nodes.length}
                      </Typography.Text>
                      <Typography.Text>
                        {t("dslModal.edgeCount")}{" "}
                        {dslPreview.dsl.edges?.length || 0}
                      </Typography.Text>
                      <Typography.Text>
                        {t("dslModal.nodeTypes")}{" "}
                        {Array.from(
                          new Set(dslPreview.dsl.nodes.map((node) => node.type))
                        ).join(", ")}
                      </Typography.Text>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};
