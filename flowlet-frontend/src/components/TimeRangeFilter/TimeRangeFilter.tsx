import React, { useState, useMemo } from "react";
import { Dropdown, Button, Space, DatePicker, Typography, Divider } from "antd";
import { AiOutlineCalendar, AiOutlineDown } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import dayjs, { Dayjs } from "dayjs";
import { createStyles } from "antd-style";

const { Text } = Typography;

const useStyles = createStyles(({ css, token }) => ({
  dropdownContent: css`
    display: flex;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08),
      0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
  `,
  presetList: css`
    padding: 8px 0;
    min-width: 160px;
  `,
  presetListWithBorder: css`
    border-right: 1px solid ${token.colorBorderSecondary};
  `,
  presetItem: css`
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.2s;
    &:hover {
      background-color: ${token.colorBgTextHover};
    }
  `,
  presetItemActive: css`
    background-color: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,
  customPanel: css`
    padding: 16px;
    min-width: 300px;
  `,
  customTitle: css`
    font-weight: 500;
    margin-bottom: 16px;
  `,
  datePickerWrapper: css`
    margin-bottom: 12px;
  `,
  buttonGroup: css`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  `,
  filterButton: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
}));

export interface TimeRange {
  startTime?: string;
  endTime?: string;
}

export interface PresetOption {
  label: string;
  value: string;
  getRange: () => TimeRange;
}

export interface TimeRangeFilterProps {
  value?: TimeRange;
  onChange?: (value: TimeRange, presetKey?: string) => void;
  defaultPreset?: string;
  presets?: PresetOption[];
  showCustom?: boolean;
  placeholder?: string;
}

// 获取默认预设选项（使用翻译函数）
const getDefaultPresets = (t: (key: string) => string): PresetOption[] => [
  {
    label: t("timeRange.presets.30m"),
    value: "30m",
    getRange: () => ({
      startTime: dayjs().subtract(30, "minute").toISOString(),
      endTime: dayjs().toISOString(),
    }),
  },
  {
    label: t("timeRange.presets.1h"),
    value: "1h",
    getRange: () => ({
      startTime: dayjs().subtract(1, "hour").toISOString(),
      endTime: dayjs().toISOString(),
    }),
  },
  {
    label: t("timeRange.presets.6h"),
    value: "6h",
    getRange: () => ({
      startTime: dayjs().subtract(6, "hour").toISOString(),
      endTime: dayjs().toISOString(),
    }),
  },
  {
    label: t("timeRange.presets.24h"),
    value: "24h",
    getRange: () => ({
      startTime: dayjs().subtract(24, "hour").toISOString(),
      endTime: dayjs().toISOString(),
    }),
  },
  {
    label: t("timeRange.presets.3d"),
    value: "3d",
    getRange: () => ({
      startTime: dayjs().subtract(3, "day").toISOString(),
      endTime: dayjs().toISOString(),
    }),
  },
  {
    label: t("timeRange.presets.7d"),
    value: "7d",
    getRange: () => ({
      startTime: dayjs().subtract(7, "day").toISOString(),
      endTime: dayjs().toISOString(),
    }),
  },
  {
    label: t("timeRange.presets.14d"),
    value: "14d",
    getRange: () => ({
      startTime: dayjs().subtract(14, "day").toISOString(),
      endTime: dayjs().toISOString(),
    }),
  },
  {
    label: t("timeRange.presets.1M"),
    value: "1M",
    getRange: () => ({
      startTime: dayjs().subtract(1, "month").toISOString(),
      endTime: dayjs().toISOString(),
    }),
  },
  {
    label: t("timeRange.presets.3M"),
    value: "3M",
    getRange: () => ({
      startTime: dayjs().subtract(3, "month").toISOString(),
      endTime: dayjs().toISOString(),
    }),
  },
  {
    label: t("timeRange.presets.all"),
    value: "all",
    getRange: () => ({
      startTime: undefined,
      endTime: undefined,
    }),
  },
];

const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({
  value,
  onChange,
  defaultPreset = "24h",
  presets: customPresets,
  showCustom = true,
  placeholder,
}) => {
  const { styles, cx } = useStyles();
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(
    defaultPreset
  );
  const [customStartTime, setCustomStartTime] = useState<Dayjs | null>(null);
  const [customEndTime, setCustomEndTime] = useState<Dayjs | null>(null);

  // 使用自定义预设或默认预设
  const presets = useMemo(
    () => customPresets || getDefaultPresets(t),
    [customPresets, t]
  );

  // 获取显示文本
  const displayText = useMemo(() => {
    if (selectedPreset === "custom") {
      if (value?.startTime && value?.endTime) {
        return `${dayjs(value.startTime).format("MM-DD HH:mm")} ~ ${dayjs(
          value.endTime
        ).format("MM-DD HH:mm")}`;
      }
      if (value?.startTime) {
        return `${dayjs(value.startTime).format("MM-DD HH:mm")} ~ ${t("timeRange.toNow")}`;
      }
      if (value?.endTime) {
        return `${t("timeRange.earliest")} ~ ${dayjs(value.endTime).format("MM-DD HH:mm")}`;
      }
      return t("timeRange.custom");
    }
    const preset = presets.find((p) => p.value === selectedPreset);
    return preset?.label || placeholder || t("timeRange.placeholder");
  }, [selectedPreset, value, presets, placeholder, t]);

  // 处理预设选择
  const handlePresetSelect = (preset: PresetOption) => {
    setSelectedPreset(preset.value);
    const range = preset.getRange();
    onChange?.(range, preset.value);
    setOpen(false);
  };

  // 处理自定义时间应用
  const handleCustomApply = () => {
    if (customStartTime || customEndTime) {
      const range: TimeRange = {
        startTime: customStartTime?.toISOString(),
        endTime: customEndTime?.toISOString(),
      };
      setSelectedPreset("custom");
      onChange?.(range, "custom");
      setOpen(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    setCustomStartTime(null);
    setCustomEndTime(null);
    setOpen(false);
  };

  // 下拉内容
  const dropdownContent = (
    <div className={styles.dropdownContent}>
      {/* 预设选项列表 */}
      <div
        className={cx(
          styles.presetList,
          selectedPreset === "custom" && styles.presetListWithBorder
        )}
      >
        {presets.map((preset) => (
          <div
            key={preset.value}
            className={cx(
              styles.presetItem,
              selectedPreset === preset.value && styles.presetItemActive
            )}
            onClick={() => handlePresetSelect(preset)}
          >
            {preset.label}
          </div>
        ))}
        {showCustom && (
          <>
            <Divider style={{ margin: "8px 0" }} />
            <div
              className={cx(
                styles.presetItem,
                selectedPreset === "custom" && styles.presetItemActive
              )}
              onClick={() => setSelectedPreset("custom")}
            >
              <Space>
                <AiOutlineCalendar />
                {t("timeRange.custom")}
              </Space>
            </div>
          </>
        )}
      </div>

      {/* 自定义时间选择面板 - 只在选择自定义时显示 */}
      {showCustom && selectedPreset === "custom" && (
        <div className={styles.customPanel}>
          <div className={styles.customTitle}>{t("timeRange.customTitle")}</div>
          <div className={styles.datePickerWrapper}>
            <Text
              type="secondary"
              style={{ display: "block", marginBottom: 4 }}
            >
              {t("timeRange.startTime")}
            </Text>
            <DatePicker
              showTime
              style={{ width: "100%" }}
              value={customStartTime}
              onChange={setCustomStartTime}
              placeholder={t("timeRange.startPlaceholder")}
              disabledDate={(current) =>
                customEndTime ? current && current > customEndTime : false
              }
            />
          </div>
          <div className={styles.datePickerWrapper}>
            <Text
              type="secondary"
              style={{ display: "block", marginBottom: 4 }}
            >
              {t("timeRange.endTime")}
            </Text>
            <DatePicker
              showTime
              style={{ width: "100%" }}
              value={customEndTime}
              onChange={setCustomEndTime}
              placeholder={t("timeRange.endPlaceholder")}
              disabledDate={(current) =>
                customStartTime ? current && current < customStartTime : false
              }
            />
          </div>
          <div className={styles.buttonGroup}>
            <Button onClick={handleCancel}>{t("action.cancel")}</Button>
            <Button
              type="primary"
              disabled={!customStartTime && !customEndTime}
              onClick={handleCustomApply}
            >
              {t("action.confirm")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      trigger={["click"]}
      open={open}
      onOpenChange={setOpen}
      popupRender={() => dropdownContent}
      placement="bottomLeft"
    >
      <Button className={styles.filterButton}>
        <AiOutlineCalendar />
        <span>{displayText}</span>
        <AiOutlineDown />
      </Button>
    </Dropdown>
  );
};

export default TimeRangeFilter;
