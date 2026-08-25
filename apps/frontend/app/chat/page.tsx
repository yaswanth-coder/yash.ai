"use client";

import { useState } from "react";

export default function ChatPage() {
const [message, setMessage] = useState("");

return ( <main className="flex flex-1 flex-col"> <div className="flex-1 p-6"> <h1 className="text-3xl font-bold">
Welcome to Yash.AI Chat </h1>

```
    <p className="mt-4 text-gray-400">
      Start a conversation with your AI assistant.
    </p>
  </div>

  <div className="border-t p-4">
    <div className="flex gap-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask Yash.AI anything..."
        className="flex-1 rounded-lg border bg-black px-4 py-3"
      />

      <button className="rounded-lg bg-blue-600 px-6 py-3 text-white">
        Send
      </button>
    </div>
  </div>
</main>
```

);
}
