export const SMS_BYTE_LIMIT = 90;
export const LMS_BYTE_LIMIT = 2000;

export type MessageTransportType = "sms" | "lms" | "too_long";

export type MessageLengthMetrics = {
  charCount: number;
  byteCount: number;
  transportType: MessageTransportType;
  hasEmoji: boolean;
  isOverLimit: boolean;
};

export function getMessageLengthMetrics(message: string): MessageLengthMetrics {
  const normalized = normalizeMessageForSending(message);
  const byteCount = getKoreanSmsByteCount(normalized);

  return {
    charCount: Array.from(normalized).length,
    byteCount,
    transportType: getTransportType(byteCount),
    hasEmoji: hasEmojiOrSupplementaryCharacter(normalized),
    isOverLimit: byteCount > LMS_BYTE_LIMIT,
  };
}

export function normalizeMessageForSending(message: string) {
  return message.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

export function getMessageLengthError(message: string) {
  const metrics = getMessageLengthMetrics(message);

  if (metrics.isOverLimit) {
    return `문자 본문은 ${LMS_BYTE_LIMIT}byte 이하로 입력해 주세요. 현재 ${metrics.byteCount}byte입니다.`;
  }

  return null;
}

function getTransportType(byteCount: number): MessageTransportType {
  if (byteCount <= SMS_BYTE_LIMIT) {
    return "sms";
  }

  if (byteCount <= LMS_BYTE_LIMIT) {
    return "lms";
  }

  return "too_long";
}

function getKoreanSmsByteCount(message: string) {
  return Array.from(message).reduce((total, character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    if (codePoint <= 0x7f) {
      return total + 1;
    }

    if (codePoint > 0xffff) {
      return total + 4;
    }

    return total + 2;
  }, 0);
}

function hasEmojiOrSupplementaryCharacter(message: string) {
  return Array.from(message).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint > 0xffff;
  });
}
