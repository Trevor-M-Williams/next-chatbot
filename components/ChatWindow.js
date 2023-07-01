import React, { useState, useEffect, useRef } from "react";

function ChatWindow() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am a chatbot trained on the Youtube channel AI-Explained. I can answer any questions you have about the channel's content.",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const messagesEndRef = useRef(null);

  const handleUserInput = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userInput.trim() !== "") {
      setUserInput("");

      const updatedMessages = [
        ...messages,
        { role: "user", content: userInput.trim() },
      ];
      setMessages(updatedMessages);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: updatedMessages }),
        });

        const data = await response.json();

        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", content: data.message },
        ]);
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  return (
    <div
      className={`flex flex-col h-[80vh] my-[10vh] mx-auto w-full max-w-xl shadow-lg bg-white rounded-lg p-4`}
    >
      <div className="overflow-y-auto grow mb-4 pr-2">
        {messages.map((message, id) => (
          <div
            key={id}
            className={`${
              message.role === "user" ? "p-3 bg-blue-100" : "p-3 bg-gray-100"
            } rounded-lg mb-4`}
          >
            {message.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          onChange={handleUserInput}
          value={userInput}
          placeholder="Type your message..."
          className="w-full rounded p-2 border border-gray-200"
        />
        <button
          type="submit"
          className="mt-2 w-full bg-blue-500 text-white p-2 rounded"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;
