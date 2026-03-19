import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

const PROTO_PATH = path.resolve(process.cwd(), "src/proto/riva_asr.proto");

const ASR_FUNCTION_ID =
  process.env.NVIDIA_ASR_FUNCTION_ID ??
  "1598d209-5e27-4d3c-8079-4751568b1081";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY ?? "";

interface RivaAlternative {
  transcript: string;
  confidence: number;
}

interface RivaResult {
  alternatives: RivaAlternative[];
}

interface RivaRecognizeResponse {
  results: RivaResult[];
}

type RivaClient = grpc.Client & {
  Recognize: (
    request: unknown,
    metadata: grpc.Metadata,
    options: { deadline: number },
    callback: (
      err: grpc.ServiceError | null,
      response: RivaRecognizeResponse
    ) => void
  ) => void;
};

let clientSingleton: RivaClient | null = null;

function getServiceClass() {
  const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(
    packageDef
  ) as grpc.GrpcObject;
  const ns = proto.nvidia as grpc.GrpcObject;
  const riva = ns.riva as grpc.GrpcObject;
  const asr = riva.asr as grpc.GrpcObject;
  return asr.RivaSpeechRecognition as grpc.ServiceClientConstructor;
}

function getClient(): RivaClient {
  if (clientSingleton) return clientSingleton;

  const ServiceClass = getServiceClass();
  clientSingleton = new ServiceClass(
    "grpc.nvcf.nvidia.com:443",
    grpc.credentials.createSsl()
  ) as unknown as RivaClient;
  return clientSingleton;
}

export async function transcribeAudio(
  pcm16Buffer: Buffer,
  sampleRate = 16000
): Promise<string> {
  const client = getClient();

  const metadata = new grpc.Metadata();
  metadata.set("function-id", ASR_FUNCTION_ID);
  metadata.set("authorization", `Bearer ${NVIDIA_API_KEY}`);

  const request = {
    config: {
      encoding: "LINEAR_PCM",
      sampleRateHertz: sampleRate,
      languageCode: "en-US",
      maxAlternatives: 1,
      enableAutomaticPunctuation: true,
    },
    audio: pcm16Buffer,
  };

  return new Promise((resolve, reject) => {
    client.Recognize(
      request,
      metadata,
      { deadline: Date.now() + 30_000 },
      (err, response) => {
        if (err) {
          reject(new Error(`NIM ASR error: ${err.message} (${err.code})`));
          return;
        }

        const transcript = (response?.results ?? [])
          .flatMap((r) => r.alternatives ?? [])
          .map((a) => a.transcript)
          .join(" ")
          .trim();

        resolve(transcript);
      }
    );
  });
}
