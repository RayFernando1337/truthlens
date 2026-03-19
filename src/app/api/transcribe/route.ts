import { transcribeAudio } from "@/lib/nvidia-asr";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    const sampleRate = Number(formData.get("sampleRate") ?? 16000);

    if (!audioFile || !(audioFile instanceof Blob)) {
      return Response.json(
        { error: "audio file is required" },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const pcmBuffer = Buffer.from(arrayBuffer);

    if (pcmBuffer.length < 320) {
      return Response.json({ text: "" });
    }

    const text = await transcribeAudio(pcmBuffer, sampleRate);
    return Response.json({ text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transcription failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
