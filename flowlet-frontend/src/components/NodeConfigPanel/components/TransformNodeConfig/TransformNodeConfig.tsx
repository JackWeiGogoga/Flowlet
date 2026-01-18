import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Radio,
  Alert,
  Tag,
} from "antd";
import {
  AiOutlinePlus,
  AiOutlineCode,
  AiOutlineEye,
  AiOutlineAppstoreAdd,
} from "react-icons/ai";
import { OutputAliasConfig } from "../OutputAliasConfig";
import { useStyles } from "./styles";
import type { TransformMode, PreviewData } from "./types";
import { useMappings } from "./useMappings";
import { MappingList } from "./MappingList";
import { BatchAddModal } from "./BatchAddModal";

const { TextArea } = Input;

/**
 * 转换节点配置组件
 * 三层渐进式设计：简单选择 -> 字段映射 -> 高级表达式
 */
export const TransformNodeConfig: React.FC = () => {
  const { styles, cx } = useStyles();
  const form = Form.useFormInstance();

  // 转换模式 - 直接从表单值派生，避免状态同步
  const formMode = Form.useWatch("mode", { form, preserve: true }) as
    | TransformMode
    | undefined;
  // mode 直接使用 formMode，提供默认值
  const mode: TransformMode = formMode || "mapping";
  const [previewData, setPreviewData] = useState<PreviewData>(null);
  const [batchModalVisible, setBatchModalVisible] = useState(false);

  const advancedScript = Form.useWatch("advancedScript", {
    form,
    preserve: true,
  }) as string | undefined;

  // 使用自定义 Hook 管理映射
  const {
    mappings,
    upstreamNodesData,
    duplicateTargets,
    hasDuplicateTargets,
    initMappings,
    addMapping,
    removeMapping,
    updateMapping,
    batchAddMappings,
  } = useMappings();

  /**
   * 预览转换结果
   */
  const handlePreview = () => {
    if (mode === "mapping" && mappings && mappings.length > 0) {
      // 简单模拟转换结果
      const result: Record<string, string | null> = {};
      mappings.forEach((m) => {
        if (m.target) {
          const baseValue = m.expression
            ? `expr:${m.expression}`
            : m.source
            ? `{{${m.source}}}`
            : null;

          if (!baseValue) {
            result[m.target] = null;
            return;
          }

          if (m.regexMode && m.regexMode !== "none") {
            const flagText = m.regexFlags ? `/${m.regexFlags}` : "/";
            const patternText = m.regexPattern
              ? `/${m.regexPattern}${flagText}`
              : "/pattern/";
            if (m.regexMode === "replace") {
              const replaceText = m.regexReplace ?? "";
              result[m.target] = `regex.replace(${baseValue}, ${patternText}, '${replaceText}')`;
              return;
            }
            if (m.regexMode === "extract") {
              const groupText = m.regexGroup ?? "0";
              result[m.target] = `regex.extract(${baseValue}, ${patternText}, ${groupText})`;
              return;
            }
            if (m.regexMode === "match") {
              result[m.target] = `regex.match(${baseValue}, ${patternText})`;
              return;
            }
          }

          result[m.target] = baseValue;
        }
      });
      setPreviewData(result);
    } else if (mode === "advanced" && advancedScript) {
      try {
        const parsed = JSON.parse(advancedScript) as Record<string, unknown>;
        setPreviewData(parsed);
      } catch {
        setPreviewData({ error: "脚本格式错误" });
      }
    }
  };

  const handleBatchAdd = (selectedFields: string[]) => {
    batchAddMappings(selectedFields);
    setBatchModalVisible(false);
  };

  return (
    <div className={styles.config}>
      {/* 提示：需要先执行上游节点测试 */}
      {upstreamNodesData.length > 0 &&
        upstreamNodesData.some((node) => !node.sampleData) && (
          <Alert
            title="提示：部分上游节点未执行测试"
            description={
              <div>
                以下节点缺少示例数据，建议先执行测试以获得更好的字段选择体验：
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  {upstreamNodesData
                    .filter((node) => !node.sampleData)
                    .map((node) => (
                      <li key={node.id}>
                        <strong>{node.label}</strong> -
                        点击该节点并执行"测试执行"
                      </li>
                    ))}
                </ul>
              </div>
            }
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

      {/* 转换模式选择 */}
      <Form.Item label="配置模式" name="mode" initialValue="mapping">
        <Radio.Group
          value={mode}
          onChange={(e) => {
            const newMode = e.target.value as TransformMode;
            form.setFieldValue("mode", newMode);
            if (newMode === "mapping") {
              initMappings();
            }
          }}
          buttonStyle="solid"
        >
          <Radio.Button value="mapping">字段映射</Radio.Button>
          <Radio.Button value="advanced">高级表达式</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {/* 模式一：字段映射表 */}
      {mode === "mapping" && (
        <div className={styles.mappingMode}>
          {/* 重复字段名警告 */}
          {hasDuplicateTargets && (
            <Alert
              title={
                <span>
                  目标字段名重复：
                  {Array.from(duplicateTargets).map((name, index) => (
                    <Tag
                      key={`dup-${index}`}
                      color="error"
                      style={{ marginLeft: 4 }}
                    >
                      {name}
                    </Tag>
                  ))}
                </span>
              }
              type="error"
              showIcon
              banner
              style={{ marginBottom: 12 }}
            />
          )}

          <Form.Item label="字段映射">
            <div className={styles.mappingContainer}>
              {/* 操作按钮 */}
              <div className={styles.mappingActions}>
                <Button
                  type="dashed"
                  onClick={addMapping}
                  icon={<AiOutlinePlus />}
                  size="small"
                >
                  添加映射
                </Button>
                <Button
                  type="primary"
                  ghost
                  onClick={() => setBatchModalVisible(true)}
                  icon={<AiOutlineAppstoreAdd />}
                  size="small"
                >
                  批量添加
                </Button>
              </div>

              {/* 映射列表 */}
              <MappingList
                mappings={mappings || []}
                upstreamNodesData={upstreamNodesData}
                duplicateTargets={duplicateTargets}
                onUpdateMapping={updateMapping}
                onRemoveMapping={removeMapping}
                styles={styles}
                cx={cx}
              />
            </div>
          </Form.Item>

          {/* 批量添加模态框 */}
          <BatchAddModal
            visible={batchModalVisible}
            onCancel={() => setBatchModalVisible(false)}
            onOk={handleBatchAdd}
            upstreamNodesData={upstreamNodesData}
            existingMappings={mappings || []}
          />
        </div>
      )}

      {/* 模式二：高级表达式 */}
      {mode === "advanced" && (
        <div className={styles.advancedMode}>
          <Form.Item
            name="advancedScript"
            label={
              <span>
                <AiOutlineCode /> SpEL 表达式脚本
              </span>
            }
            extra="支持 Spring Expression Language，可访问所有上游节点数据"
          >
            <TextArea
              rows={10}
              placeholder={`使用 SpEL 编写转换逻辑，示例：
// 访问变量: #api_node.body.data.userId
// 字符串操作: #api_node.body.name.toUpperCase()
// 条件判断: #value > 100 ? 'high' : 'low'
// 数组操作: #api_node.body.items.?[price > 100]
              
{
  "userId": #api_node.body.data.id,
  "fullName": #api_node.body.firstName + ' ' + #api_node.body.lastName,
  "isVip": #api_node.body.score > 1000
}`}
              style={{ fontFamily: "monospace" }}
            />
          </Form.Item>

          <Alert
            title="提示"
            description="高级模式适合开发者使用，支持复杂的数据转换逻辑"
            type="info"
            showIcon
          />
        </div>
      )}

      {/* 预览按钮 */}
      <Form.Item>
        <Button
          icon={<AiOutlineEye />}
          onClick={handlePreview}
          style={{ marginTop: 8 }}
        >
          预览转换结果
        </Button>
      </Form.Item>

      {/* 预览结果 */}
      {previewData && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>预览输出</div>
          <pre className={styles.previewContent}>
            {JSON.stringify(previewData, null, 2)}
          </pre>
        </div>
      )}

      {/* 输出别名配置 */}
      <OutputAliasConfig />
    </div>
  );
};

export default TransformNodeConfig;
