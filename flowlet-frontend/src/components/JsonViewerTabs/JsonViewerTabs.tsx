import React, { useMemo, useState } from "react";
import { Tooltip } from "antd";
import ReactJson from "react-json-view";
import { useStyles } from "./JsonViewerTabs.style";
import {
  AiOutlineCode,
  AiOutlineCopy,
  AiOutlineExpand,
  AiOutlineCompress,
  AiOutlineFileText,
} from "react-icons/ai";
import { message } from "@/components/AppMessageContext/staticMethods";

type JsonViewerTabsVariant = "solid" | "transparent";

interface JsonViewerTabsProps {
  value?: unknown;
  defaultTab?: "source" | "json";
  variant?: JsonViewerTabsVariant;
  className?: string;
}

const getParsedValue = (value: unknown) => {
  if (typeof value === "string") {
    try {
      return { parsed: JSON.parse(value), parsedFromString: true };
    } catch {
      return { parsed: value, parsedFromString: false };
    }
  }
  return { parsed: value, parsedFromString: false };
};

export const JsonViewerTabs: React.FC<JsonViewerTabsProps> = ({
  value,
  defaultTab = "source",
  variant = "solid",
  className,
}) => {
  const { styles, cx } = useStyles();
  const isTransparent = variant === "transparent";
  const [mode, setMode] = useState<"source" | "json">(defaultTab);
  const [collapsed, setCollapsed] = useState(false);

  const { sourceText, jsonSrc } = useMemo(() => {
    const { parsed, parsedFromString } = getParsedValue(value);
    const normalizedParsed = parsed === undefined ? null : parsed;

    let text = "";
    if (parsedFromString || typeof normalizedParsed === "object") {
      try {
        text = JSON.stringify(normalizedParsed, null, 2) ?? "";
      } catch {
        text = String(value ?? "");
      }
    } else {
      text = String(normalizedParsed ?? "");
    }

    const src =
      normalizedParsed !== null && typeof normalizedParsed === "object"
        ? normalizedParsed
        : { value: normalizedParsed };

    return { sourceText: text, jsonSrc: src };
  }, [value]);

  const sourceLines = sourceText.split("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sourceText);
      message.success("已复制到剪贴板");
    } catch {
      message.error("复制失败");
    }
  };

  return (
    <div className={cx(styles.wrapper, className)}>
      <div className={styles.toolbar}>
        <div className={cx(styles.toolbarContent, "json-toolbar")}>
          <Tooltip title={mode === "source" ? "切换到 JSON" : "切换到源码"}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() =>
                setMode((prev) => (prev === "source" ? "json" : "source"))
              }
            >
              {mode === "source" ? <AiOutlineFileText /> : <AiOutlineCode />}
            </button>
          </Tooltip>
          {mode === "source" ? (
            <Tooltip title="复制">
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={handleCopy}
              >
                <AiOutlineCopy />
              </button>
            </Tooltip>
          ) : (
            <Tooltip title={collapsed ? "展开" : "折叠"}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => setCollapsed((prev) => !prev)}
              >
                {collapsed ? <AiOutlineExpand /> : <AiOutlineCompress />}
              </button>
            </Tooltip>
          )}
        </div>
      </div>
      {mode === "source" ? (
        <div
          className={cx(
            styles.codeBlock,
            isTransparent && styles.codeBlockTransparent
          )}
        >
          <div
            className={cx(
              styles.lineNumbers,
              isTransparent && styles.lineNumbersTransparent
            )}
          >
            {sourceLines.map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <pre className={styles.codeContent}>{sourceText}</pre>
        </div>
      ) : (
        <div
          className={cx(
            styles.jsonViewer,
            isTransparent && styles.jsonViewerTransparent
          )}
        >
          <ReactJson
            src={jsonSrc as never}
            name={false}
            collapsed={collapsed}
            enableClipboard={false}
            displayDataTypes={false}
            displayObjectSize={false}
            indentWidth={2}
          />
        </div>
      )}
    </div>
  );
};

export default JsonViewerTabs;
