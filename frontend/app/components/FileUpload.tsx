"use client";

import { useState } from "react";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Read URL from environment variable
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleUpload = async () => {
    if (!file) {
      alert("Please choose a file!");
      return;
    }

    if (!API_URL) {
      alert("API URL is missing. Add NEXT_PUBLIC_API_URL to .env.local");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch(`${API_URL}/file-upload`, {
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
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Timeline Extraction</h1>

      <div className="flex items-center space-x-6">

        {/* Choose File Box */}
        <label className="border-2 border-dashed border-gray-400 rounded-xl p-6 text-center cursor-pointer hover:border-gray-600 transition w-64">
          <p className="text-gray-700">
            {file ? file.name : "Click to choose file"}
          </p>
          <p className="text-xs text-gray-500 mt-1">(or drag & drop)</p>

          <input
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-full shadow hover:bg-blue-700 transition-all"
        >
          Upload
        </button>
      </div>

      {loading && (
        <p className="text-gray-600 mt-4 animate-pulse">Uploading...</p>
      )}

      {response && (
        <pre className="bg-gray-100 p-4 mt-6 rounded-lg text-sm">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}
