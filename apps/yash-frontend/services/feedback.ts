import api from "@/lib/axios";

export async function submitMessageFeedback(
  messageId: string,
  feedbackType: "positive" | "negative",
  comment?: string
): Promise<boolean> {
  try {
    await api.post("/feedback/", {
      message_id: messageId,
      feedback_type: feedbackType,
      comment,
    });
    return true;
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return false;
  }
}

export async function exportUserData(): Promise<any> {
  try {
    const res = await api.get("/user/export");
    return res.data;
  } catch (error) {
    console.error("Error exporting user data:", error);
    return null;
  }
}

export async function deleteUserAccount(): Promise<boolean> {
  try {
    await api.delete("/user/account");
    return true;
  } catch (error) {
    console.error("Error deleting user account:", error);
    return false;
  }
}
