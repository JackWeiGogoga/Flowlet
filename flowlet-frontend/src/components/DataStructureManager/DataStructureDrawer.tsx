import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Drawer,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tabs,
  Alert,
  Spin,
  Switch,
  Tag,
  Tooltip,
} from "antd";
import { FiCode, FiList, FiPlus, FiTrash2 } from "react-icons/fi";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { message } from "@/components/AppMessageContext/staticMethods";
import dataStructureService, {
  type FieldDefinition,
  type TypeParameter,
  type DataStructureResponse,
  type DataStructureRequest,
} from "@/services/dataStructureService";
import { FieldEditor } from "./FieldEditor";
import { useStyles } from "./DataStructureManager.style";

interface DataStructureDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: (structure: DataStructureResponse) => void;
  projectId: string;
  flowId?: string; // 当前流程 ID（用于创建流程级结构）
  editingStructure?: DataStructureResponse | null;
  flows?: { id: string; name: string }[]; // 可选的流程列表
  dataStructures?: DataStructureResponse[];
}

export const DataStructureDrawer: React.FC<DataStructureDrawerProps> = ({
  open,
  onClose,
  onSaved,
  projectId,
  flowId,
  editingStructure,
  flows = [],
  dataStructures = [],
}) => {
  const { t } = useTranslation("dictionary");
  const { t: tCommon } = useTranslation("common");
  const { styles } = useStyles();
  const [form] = Form.useForm();
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [typeParameters, setTypeParameters] = useState<TypeParameter[]>([]);
  const [isGeneric, setIsGeneric] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"fields" | "json">("fields");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const isEditing = !!editingStructure;

  useEffect(() => {
    if (open) {
      if (editingStructure) {
        form.setFieldsValue({
          name: editingStructure.name,
          description: editingStructure.description,
          flowId: editingStructure.flowId || "",
        });
        setFields(editingStructure.fields || []);
        setTypeParameters(editingStructure.typeParameters || []);
        setIsGeneric(editingStructure.isGeneric || false);
      } else {
        form.resetFields();
        form.setFieldsValue({ flowId: flowId || "" });
        setFields([]);
        setTypeParameters([]);
        setIsGeneric(false);
      }
      setJsonInput("");
      setJsonError(null);
      setActiveTab("fields");
    }
  }, [open, editingStructure, flowId, form]);

  const handleJsonParse = async () => {
    if (!jsonInput.trim()) {
      setJsonError(t("dataStructure.drawer.enterJson"));
      return;
    }

    try {
      JSON.parse(jsonInput);
      setJsonError(null);

      const previewFields = await dataStructureService.previewGenerate(
        projectId,
        jsonInput
      );
      setFields(previewFields);
      setActiveTab("fields");
      message.success(t("dataStructure.message.jsonGenerated"));
    } catch (e) {
      if (e instanceof SyntaxError) {
        setJsonError(t("dataStructure.drawer.invalidJson", { error: e.message }));
      } else {
        setJsonError(t("dataStructure.drawer.parseFailed"));
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (fields.length === 0) {
        message.error(t("dataStructure.message.atLeastOneField"));
        return;
      }

      const emptyNameField = fields.find((f) => !f.name.trim());
      if (emptyNameField) {
        message.error(t("dataStructure.message.fieldNameRequired"));
        return;
      }

      setLoading(true);

      const request: DataStructureRequest = {
        name: values.name,
        description: values.description,
        flowId: values.flowId || undefined,
        fields,
        typeParameters: isGeneric ? typeParameters : undefined,
      };

      let result: DataStructureResponse;
      if (isEditing && editingStructure) {
        result = await dataStructureService.update(
          projectId,
          editingStructure.id,
          request
        );
        message.success(t("dataStructure.message.updated"));
      } else {
        result = await dataStructureService.create(projectId, request);
        message.success(t("dataStructure.message.created"));
      }

      onSaved(result);
      onClose();
    } catch (error: unknown) {
      console.error("保存数据结构失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : t("dataStructure.message.saveFailed");
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const scopeOptions = useMemo(() => {
    const options = [
      { value: "", label: t("dataStructure.drawer.scopeProjectLevel") },
      ...flows.map((f) => ({ value: f.id, label: t("dataStructure.drawer.scopeFlowPrefix", { name: f.name }) })),
    ];

    if (flowId && !flows.find((f) => f.id === flowId)) {
      options.push({ value: flowId, label: t("dataStructure.drawer.scopeCurrentFlow") });
    }

    return options;
  }, [flows, flowId, t]);

  return (
    <Drawer
      title={isEditing ? t("dataStructure.drawer.editTitle") : t("dataStructure.drawer.createTitle")}
      open={open}
      onClose={onClose}
      size={600}
      footer={
        <div className={styles.drawerFooter}>
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            {isEditing ? tCommon("save") : tCommon("create")}
          </Button>
        </div>
      }
    >
      <Spin spinning={loading}>
        <div className={styles.drawerContent}>
          <Form form={form} layout="vertical" className={styles.drawerForm}>
            <Form.Item
              name="name"
              label={t("dataStructure.drawer.name")}
              rules={[
                { required: true, message: t("dataStructure.drawer.nameRequired") },
                {
                  pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
                  message: t("dataStructure.drawer.namePattern"),
                },
              ]}
            >
              <Input placeholder={t("dataStructure.drawer.namePlaceholder")} />
            </Form.Item>

            <Form.Item name="description" label={t("dataStructure.drawer.description")}>
              <Input.TextArea placeholder={t("dataStructure.drawer.descriptionPlaceholder")} rows={2} />
            </Form.Item>

            <Form.Item name="flowId" label={t("dataStructure.drawer.scope")}>
              <Select
                options={scopeOptions}
                placeholder={t("dataStructure.drawer.scopePlaceholder")}
                disabled={isEditing}
              />
            </Form.Item>

            {/* 泛型参数配置 */}
            <Form.Item
              label={
                <Space>
                  <span>{t("dataStructure.drawer.genericParams")}</span>
                  <Tooltip
                    title={
                      <div>
                        <p>{t("dataStructure.drawer.genericTooltip1")}</p>
                        <p>{t("dataStructure.drawer.genericTooltip2")}</p>
                      </div>
                    }
                  >
                    <AiOutlineQuestionCircle style={{ cursor: "help" }} />
                  </Tooltip>
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <Space>
                  <Switch
                    checked={isGeneric}
                    onChange={(checked) => {
                      setIsGeneric(checked);
                      if (!checked) {
                        setTypeParameters([]);
                      } else if (typeParameters.length === 0) {
                        setTypeParameters([
                          { name: "T", description: "Data Type" },
                        ]);
                      }
                    }}
                  />
                  <span>{t("dataStructure.drawer.enableGeneric")}</span>
                  {isGeneric && typeParameters.length > 0 && (
                    <Tag color="blue">
                      {form.getFieldValue("name") || "Structure"}
                      &lt;{typeParameters.map((p) => p.name).join(", ")}&gt;
                    </Tag>
                  )}
                </Space>

                {isGeneric && (
                  <div style={{ marginTop: 8 }}>
                    {typeParameters.map((param, index) => (
                      <Space
                        key={index}
                        style={{ display: "flex", marginBottom: 8 }}
                        align="baseline"
                      >
                        <Input
                          value={param.name}
                          onChange={(e) => {
                            const newParams = [...typeParameters];
                            newParams[index] = {
                              ...param,
                              name: e.target.value.toUpperCase(),
                            };
                            setTypeParameters(newParams);
                          }}
                          placeholder={t("dataStructure.drawer.paramName")}
                          style={{ width: 80 }}
                          maxLength={10}
                        />
                        <Input
                          value={param.description}
                          onChange={(e) => {
                            const newParams = [...typeParameters];
                            newParams[index] = {
                              ...param,
                              description: e.target.value,
                            };
                            setTypeParameters(newParams);
                          }}
                          placeholder={t("dataStructure.drawer.paramDesc")}
                          style={{ width: 150 }}
                        />
                        <Select
                          value={param.constraint || "any"}
                          onChange={(value) => {
                            const newParams = [...typeParameters];
                            newParams[index] = {
                              ...param,
                              constraint: value === "any" ? undefined : value,
                            };
                            setTypeParameters(newParams);
                          }}
                          style={{ width: 100 }}
                          options={[
                            { value: "any", label: t("dataStructure.drawer.constraintAny") },
                            { value: "object", label: t("dataStructure.drawer.constraintObject") },
                            { value: "array", label: t("dataStructure.drawer.constraintArray") },
                            { value: "string", label: t("dataStructure.drawer.constraintString") },
                            { value: "number", label: t("dataStructure.drawer.constraintNumber") },
                          ]}
                        />
                        <Button
                          type="text"
                          danger
                          icon={<FiTrash2 />}
                          onClick={() => {
                            setTypeParameters(
                              typeParameters.filter((_, i) => i !== index)
                            );
                          }}
                          disabled={typeParameters.length <= 1}
                        />
                      </Space>
                    ))}
                    <Button
                      type="dashed"
                      size="small"
                      icon={<FiPlus />}
                      onClick={() => {
                        const usedNames = typeParameters.map((p) => p.name);
                        const nextName =
                          ["T", "E", "K", "V", "R", "U"].find(
                            (n) => !usedNames.includes(n)
                          ) || `T${typeParameters.length + 1}`;
                        setTypeParameters([
                          ...typeParameters,
                          { name: nextName },
                        ]);
                      }}
                    >
                      {t("dataStructure.drawer.addParam")}
                    </Button>
                  </div>
                )}
              </Space>
            </Form.Item>

            <Form.Item label={t("dataStructure.drawer.fieldDefinition")} required>
              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as "fields" | "json")}
                items={[
                  {
                    key: "fields",
                    label: (
                      <Space>
                        <FiList />
                        {t("dataStructure.drawer.fieldEditor")}
                      </Space>
                    ),
                    children: (
                      <FieldEditor
                        fields={fields}
                        onChange={setFields}
                        typeParameters={isGeneric ? typeParameters : []}
                        dataStructures={dataStructures}
                      />
                    ),
                  },
                  {
                    key: "json",
                    label: (
                      <Space>
                        <FiCode />
                        {t("dataStructure.drawer.fromJson")}
                      </Space>
                    ),
                    children: (
                      <div>
                        <Input.TextArea
                          value={jsonInput}
                          onChange={(e) => setJsonInput(e.target.value)}
                          placeholder={t("dataStructure.drawer.jsonPlaceholder")}
                          rows={8}
                          style={{ fontFamily: "monospace" }}
                        />
                        {jsonError && (
                          <Alert
                            type="error"
                            message={jsonError}
                            style={{ marginTop: 8 }}
                          />
                        )}
                        <Button
                          type="primary"
                          onClick={handleJsonParse}
                          style={{ marginTop: 8 }}
                        >
                          {t("dataStructure.drawer.parseAndGenerate")}
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </Form.Item>
          </Form>
        </div>
      </Spin>
    </Drawer>
  );
};
