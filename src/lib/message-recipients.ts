export const messageRecipientTypes = ["parent", "student", "both"] as const;

export type MessageRecipientType = (typeof messageRecipientTypes)[number];

export const messageRecipientLabels: Record<MessageRecipientType, string> = {
  parent: "학부모",
  student: "학생",
  both: "학부모+학생",
};

export function isMessageRecipientType(value: unknown): value is MessageRecipientType {
  return (
    typeof value === "string" &&
    messageRecipientTypes.includes(value as MessageRecipientType)
  );
}
