import AlephAlpha from "./assets/AlephAlpha";
import Anthropic from "./assets/Anthropic";
import AnyScale from "./assets/AnyScale";
// import Azure from "./assets/Azure";
// import Bedrock from "./assets/Bedrock";
import Cerebus from "./assets/Cerebus";
import DeepInfra from "./assets/DeepInfra";
import Gemini from "./assets/Gemini";
import Groq from "./assets/Groq";
import Mistral from "./assets/Mistral";
import OpenAi from "./assets/OpenAi";
import OpenRouter from "./assets/OpenRouter";
import Perplexity from "./assets/Perplexity";
import Together from "./assets/Together";
// import Vertex from "./assets/Vertex";

const IconMap: Record<string, React.FC<{ className?: string }>> = {
  OpenAI: OpenAi,
  OpenRouter: OpenRouter,
  Anthropic: Anthropic,
  "Google Gemini": Gemini,
  Groq: Groq,
  "Mistral AI": Mistral,
  Cohere: Cerebus,
  Anyscale: AnyScale,
  "Perplexity AI": Perplexity,
  DeepInfra: DeepInfra,
  "Together AI": Together,
  "Aleph Alpha": AlephAlpha,
  //   "Google Vertex AI": Vertex,
  //   "AWS Bedrock": Bedrock,
  // "AWS SageMaker": Sagemaker,
  //   "Azure OpenAI": Azure,
};

export default IconMap;
