import { useEffect, useState } from "react";

function App() {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");

useEffect(() => {
  // Initial fetch of all messages
  fetch("http://localhost:3000/messages")
    .then(res => res.json())
    .then(data => setMessages(data));

  // Live updates via Server-Sent Events
  const events = new EventSource("http://localhost:3000/events");

  events.onmessage = (event) => {
    const newMessage = JSON.parse(event.data);
    setMessages(prev => [newMessage, ...prev]);
  };

  // Cleanup when component unmounts
  return () => {
    events.close();
  };
}, []);



  // Send a new message
  const sendMessage = async () => {
    await fetch("http://localhost:3000/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });

    // Refresh messages
    const updated = await fetch("http://localhost:3000/messages").then(res => res.json());
    setMessages(updated);
    setContent("");
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Unified API Messages</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Type a message..."
          style={{ padding: 8, width: 250 }}
        />
        <button onClick={sendMessage} style={{ marginLeft: 10, padding: "8px 16px" }}>
          Send
        </button>
      </div>

      <ul>
        {messages.map(msg => (
          <li key={msg.id}>
            {msg.content} — <small>{new Date(msg.created_at).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
