import React, { useState, useEffect } from "react";
import { Select, Space, Tag, Tooltip, type SelectProps } from "antd";
import { FiDatabase, FiGlobe, FiLayers } from "react-icons/fi";
import dataStructureService, {
  type DataStructureResponse,
} from "@/services/dataStructureService";

interface DataStructureSelectorProps {
  value?: string; // 结构 ID
  onChange?: (
    value: string | undefined,
    structure?: DataStructureResponse
  ) => void;
  projectId: string;
  flowId?: string; // 当前流程 ID
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  style?: React.CSSProperties;
  showFullName?: boolean; // 是否显示完整引用名称
}

export const DataStructureSelector: React.FC<DataStructureSelectorProps> = ({
  value,
  onChange,
  projectId,
  flowId,
  placeholder = "选择数据结构",
  disabled = false,
  allowClear = true,
  style,
  showFullName = true,
}) => {
  type SelectSearchConfig = Exclude<
    NonNullable<SelectProps<string>["showSearch"]>,
    boolean
  >;
  type SelectFilterOption = NonNullable<SelectSearchConfig["filterOption"]>;

  const [structures, setStructures] = useState<DataStructureResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStructures = async () => {
      if (!projectId) return;

      setLoading(true);
      try {
        const list = await dataStructureService.getAvailable(projectId, flowId);
        setStructures(list);
      } catch (error) {
        console.error("加载数据结构失败:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStructures();
  }, [projectId, flowId]);

  const handleChange = (selectedId: string | undefined) => {
    const structure = selectedId
      ? structures.find((s) => s.id === selectedId)
      : undefined;
    onChange?.(selectedId, structure);
  };

  const filterOption: SelectFilterOption = (input, option) => {
    if (!option?.value) return false;
    const structure = structures.find((s) => s.id === option.value);
    if (!structure) return false;
    const keyword = input.toLowerCase();
    return Boolean(
      structure.name?.toLowerCase().includes(keyword) ||
        structure.fullName?.toLowerCase().includes(keyword) ||
        structure.flowName?.toLowerCase().includes(keyword)
    );
  };

  // 分组选项
  const groupedOptions = React.useMemo<SelectProps<string>["options"]>(() => {
    const groups: NonNullable<SelectProps<string>["options"]> = [];

    // 项目级结构
    const projectLevelStructures = structures.filter((s) => !s.flowId);
    if (projectLevelStructures.length > 0) {
      groups.push({
        label: (
          <Space>
            <FiGlobe />
            <span>项目级 (global)</span>
          </Space>
        ),
        options: projectLevelStructures.map((s) => ({
          value: s.id,
          label: (
            <Space>
              <span>{s.name}</span>
              {showFullName && (
                <Tag color="blue" style={{ fontSize: 10 }}>
                  global.{s.name}
                </Tag>
              )}
            </Space>
          ),
        })),
      });
    }

    // 当前流程的结构
    if (flowId) {
      const currentFlowStructures = structures.filter(
        (s) => s.flowId === flowId
      );
      if (currentFlowStructures.length > 0) {
        groups.push({
          label: (
            <Space>
              <FiLayers />
              <span>当前流程</span>
            </Space>
          ),
          options: currentFlowStructures.map((s) => ({
            value: s.id,
            label: (
              <Space>
                <span>{s.name}</span>
                {showFullName && s.flowName && (
                  <Tag color="green" style={{ fontSize: 10 }}>
                    {s.flowName}.{s.name}
                  </Tag>
                )}
              </Space>
            ),
          })),
        });
      }
    }

    // 其他流程的结构
    const otherFlowStructures = structures.filter(
      (s) => s.flowId && s.flowId !== flowId
    );
    if (otherFlowStructures.length > 0) {
      // 按流程分组
      const flowMap = new Map<string, DataStructureResponse[]>();
      otherFlowStructures.forEach((s) => {
        const key = s.flowName || s.flowId || "unknown";
        if (!flowMap.has(key)) {
          flowMap.set(key, []);
        }
        flowMap.get(key)!.push(s);
      });

      flowMap.forEach((list, flowName) => {
        groups.push({
          label: (
            <Space>
              <FiDatabase />
              <span>流程: {flowName}</span>
            </Space>
          ),
          options: list.map((s) => ({
            value: s.id,
            label: (
              <Tooltip title={`引用: ${s.fullName}`}>
                <Space>
                  <span>{s.name}</span>
                  {showFullName && (
                    <Tag color="orange" style={{ fontSize: 10 }}>
                      {s.fullName}
                    </Tag>
                  )}
                </Space>
              </Tooltip>
            ),
          })),
        });
      });
    }

    return groups;
  }, [structures, flowId, showFullName]);

  return (
    <Select
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      loading={loading}
      allowClear={allowClear}
      style={{ width: "100%", ...style }}
      options={groupedOptions}
      showSearch={{ filterOption, optionFilterProp: "value" }}
    />
  );
};
