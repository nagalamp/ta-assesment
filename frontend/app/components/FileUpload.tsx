"use client";

import { useState } from "react";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please choose a file!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("http://localhost:5001/file-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error("Upload failed:", error);
      setResponse({ error: "Upload failed" });
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload File</h2>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={handleUpload}
        style={{
          marginLeft: 10,
          padding: "6px 12px",
          background: "black",
          color: "white",
        }}
      >
        Upload
      </button>

      {loading && <p>Uploading...</p>}

      {response && (
        <pre
          style={{
            background: "#eee",
            padding: 10,
            marginTop: 20,
            borderRadius: 8,
          }}
        >
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}
