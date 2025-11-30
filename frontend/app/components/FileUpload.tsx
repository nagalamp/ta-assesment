"use client";

import { useState } from "react";
import Timetable from './Timetable';
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

      console.log(data.structuredData.structuredData)


      setResponse(data);
    } catch (error) {
      console.error("Upload failed:", error);
      setResponse({ error: "Upload failed" });
    }

    setLoading(false);
  };

  return (
    <div className="p-10 w-full h-full">
  
      <h1 className="text-3xl font-bold mb-6">Timeline Extraction</h1>
  
      {/* MAIN LAYOUT: LEFT (UPLOAD 25%) | RIGHT (CONTENT 75%) */}
      <div className="flex w-full gap-6">
  
        {/* LEFT PANEL - 25% */}
        <div className="w-1/4 flex flex-col items-center">
  
          {/* Choose File */}
          <label className="border-2 border-dashed border-gray-400 rounded-xl p-6 text-center cursor-pointer hover:border-gray-600 transition w-full">
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
            className="mt-4 px-6 py-2 bg-blue-600 text-white font-medium rounded-full shadow hover:bg-blue-700 transition-all w-full"
          >
            Upload
          </button>
  
          {loading && (
            <p className="mt-4 text-gray-600 animate-pulse text-center">Uploading...</p>
          )}
        </div>
  
        {/* RIGHT PANEL - 75% */}
        <div className="w-full flex flex-col items-center">
  
          <div className="w-full ">
  
            {response && (
              <div className=" border rounded-lg bg-gray-50 p-4 shadow w-full">
                <pre className="text-sm whitespace-pre-wrap break-words text-center">
                  <Timetable data={response.structuredData.structuredData} />
                </pre>
              </div>
            )}
  
            {!response && (
              <div className="text-gray-400 text-center mt-20">
                <p>No content yet. Upload a file to process.</p>
              </div>
            )}
  
          </div>
        </div>
      </div>
    </div>
  );
}
