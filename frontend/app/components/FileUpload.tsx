"use client";

import { useState } from "react";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="p-10 flex flex-col items-center">

      <h1 className="text-3xl font-bold mb-6">Timeline Extraction</h1>

      {/* Upload Area */}
      <div className="flex items-center space-x-6 mb-6">

        {/* Choose File */}
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

      {/* Response Section */}
      <div className="mt-4 w-full flex justify-center">
        <div className="w-full max-w-2xl flex flex-col items-center">
          
          {loading && (
            <p className="text-gray-600 animate-pulse text-center">Uploading...</p>
          )}

          {response && (
            <div className="max-h-[400px] overflow-auto border rounded-lg bg-gray-50 p-4 shadow w-full">
              <pre className="text-sm whitespace-pre-wrap break-words text-center">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
