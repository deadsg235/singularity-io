type AudioFormat = "pcm16" | "g711_ulaw" | "g722";

export function audioFormatForCodec(codecParam?: string | null): AudioFormat {
  switch (codecParam) {
    case "g711":
    case "pcmu":
      return "g711_ulaw";
    case "g722":
      return "g722";
    case "pcm16-44k":
    case "pcm16-48k":
      return "pcm16";
    default:
      return "pcm16";
  }
}

/**
 * Applies a preferred audio codec ordering to an `RTCPeerConnection`.
 * If the runtime does not support codec munging, the function safely no-ops.
 */
export function applyCodecPreferences(pc: RTCPeerConnection, codecParam?: string | null) {
  if (!codecParam) return;
  try {
    const transceivers = pc.getTransceivers();
    const audioTransceiver = transceivers.find((t) => t.sender && t.sender.track?.kind === "audio");
    if (
      !audioTransceiver ||
      typeof RTCRtpSender === "undefined" ||
      typeof RTCRtpSender.getCapabilities !== "function"
    ) {
      return;
    }

    const capabilities = RTCRtpSender.getCapabilities("audio");
    if (!capabilities?.codecs) return;

    const preferred = capabilities.codecs.find((codec) =>
      codec.mimeType.toLowerCase().includes(codecParam.toLowerCase()),
    );
    if (!preferred) return;

    const otherCodecs = capabilities.codecs.filter((codec) => codec !== preferred);
    audioTransceiver.setCodecPreferences([preferred, ...otherCodecs]);
  } catch (error) {
    console.warn("Failed to apply codec preference", error);
  }
}
