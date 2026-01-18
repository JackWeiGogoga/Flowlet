import { NodeType } from "@/types";

export const DEFAULT_CODE_SNIPPET = `def run(inputs, context):\n    return {"ok": True}\n`;

export const getNodeDefaultConfig = (
  nodeType: NodeType | string
): Record<string, unknown> => {
  if (nodeType === NodeType.CODE) {
    return {
      language: "python",
      code: DEFAULT_CODE_SNIPPET,
      inputs: [],
      timeoutMs: 3000,
      memoryMb: 128,
      allowNetwork: false,
    };
  }

  if (nodeType === NodeType.VECTOR_STORE) {
    return {
      operation: "upsert",
      collection: "",
      topK: 5,
      includeMetadata: true,
    };
  }

  if (nodeType === NodeType.SIMHASH) {
    return {
      mode: "store",
      textExpression: "",
      contentIdExpression: "",
      maxDistance: 3,
      targetFlowIds: [],
    };
  }

  if (nodeType === NodeType.KEYWORD_MATCH) {
    return {
      libraryId: "",
      textExpression: "",
    };
  }

  if (nodeType === NodeType.FOR_EACH) {
    return {
      itemsExpression: "",
      mode: "serial",
      itemVariable: "item",
      indexVariable: "index",
      inputMappings: [],
      continueOnError: false,
      timeout: 30000,
    };
  }

  return {};
};
