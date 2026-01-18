import React from "react";
import { Form, Input, Tooltip } from "antd";
import { AiOutlineQuestionCircle } from "react-icons/ai";

/**
 * 输出别名配置组件
 * 允许用户为节点的输出设置一个全局变量别名
 * 主要用于处理条件分支汇聚时的变量引用问题
 */
export const OutputAliasConfig: React.FC = () => {
  return (
    <div className="output-alias-section">
      <Form.Item
        name="outputAlias"
        label={
          <span>
            输出别名
            <Tooltip
              title={
                <div>
                  <p>为节点输出设置一个全局变量别名。</p>
                  <p>
                    <b>使用场景：</b>
                    在条件分支中，多个分支节点可以使用相同的别名，
                    汇聚后的节点可以通过统一的变量名引用输出结果。
                  </p>
                  <p>
                    <b>示例：</b>分支中的 API1 和 API2 都设置别名为
                    <code>llmResult</code>，后续节点可直接使用
                    <code>{"{{llmResult.response}}"}</code> 引用。
                  </p>
                </div>
              }
            >
              <AiOutlineQuestionCircle
                style={{ marginLeft: 4, cursor: "help" }}
              />
            </Tooltip>
          </span>
        }
        extra="设置后可通过 {{别名.字段名}} 引用此节点输出"
      >
        <Input placeholder="如: llmResult、apiData" style={{ width: "100%" }} />
      </Form.Item>
    </div>
  );
};

export default OutputAliasConfig;
