import Tesseract from "tesseract.js";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

// Function to extract text with multiple orientations
async function extractTextAllOrientations(imagePath) {
  console.log("Extracting text from all orientations...");
  
  const orientations = [
    { psm: Tesseract.PSM.AUTO, name: "Auto" },
    { psm: Tesseract.PSM.AUTO_OSD, name: "Auto OSD" },
    { psm: Tesseract.PSM.SINGLE_BLOCK, name: "Single Block" },
    { psm: Tesseract.PSM.SINGLE_BLOCK_VERT_TEXT, name: "Vertical Text" },
    { psm: Tesseract.PSM.SINGLE_COLUMN, name: "Single Column" },
    { psm: Tesseract.PSM.SINGLE_LINE, name: "Single Line" },
  ];

  let allTexts = [];
  let bestHorizontal = { text: "", confidence: 0 };
  let bestVertical = { text: "", confidence: 0 };

  for (const orientation of orientations) {
    try {
      console.log(`Trying ${orientation.name}...`);
      
      const { data } = await Tesseract.recognize(imagePath, "eng", {
        dpi: 300,
        psm: orientation.psm,
        oem: 1,
      });

      console.log(`${orientation.name} - Confidence: ${data.confidence}, Chars: ${data.text.length}`);

      const textData = {
        text: data.text,
        confidence: data.confidence,
        orientation: orientation.name,
        psm: orientation.psm
      };

      allTexts.push(textData);

      // Classify as horizontal or vertical based on PSM mode
      if (orientation.psm === Tesseract.PSM.SINGLE_BLOCK_VERT_TEXT) {
        if (data.confidence > bestVertical.confidence) {
          bestVertical = textData;
        }
      } else {
        if (data.confidence > bestHorizontal.confidence) {
          bestHorizontal = textData;
        }
      }

    } catch (error) {
      console.error(`${orientation.name} failed:`, error.message);
    }
  }

  console.log(`Best Horizontal: ${bestHorizontal.orientation} (conf: ${bestHorizontal.confidence})`);
  console.log(`Best Vertical: ${bestVertical.orientation} (conf: ${bestVertical.confidence})`);

  // Combine both horizontal and vertical texts
  let combinedText = "";
  
  if (bestHorizontal.text && bestHorizontal.confidence > 0) {
    combinedText += `HORIZONTAL TEXT (${bestHorizontal.orientation}):\n${bestHorizontal.text}\n\n`;
  }
  
  if (bestVertical.text && bestVertical.confidence > 0) {
    combinedText += `VERTICAL TEXT (${bestVertical.orientation}):\n${bestVertical.text}\n\n`;
  }

  // If no good separation, just use all unique text
  if (!combinedText.trim()) {
    const uniqueTexts = new Set();
    allTexts.forEach(item => {
      if (item.text.trim()) {
        uniqueTexts.add(item.text.trim());
      }
    });
    combinedText = Array.from(uniqueTexts).join('\n\n');
  }

  return combinedText;
}

// Manual rotation approach
async function extractWithRotations(imagePath) {
  console.log("Extracting with manual rotations...");
  
  let rotationResults = [];
  
  try {
    const sharp = await import('sharp');
    
    const rotations = [
      { angle: 0, name: "Original" },
      { angle: 90, name: "90 Clockwise" },
      { angle: 180, name: "180" },
      { angle: 270, name: "90 Counter-Clockwise" },
    ];
    
    for (const rotation of rotations) {
      console.log(`Rotating ${rotation.name}...`);
      
      let imageBuffer;
      if (rotation.angle === 0) {
        imageBuffer = fs.readFileSync(imagePath);
      } else {
        imageBuffer = await sharp.default(imagePath)
          .rotate(rotation.angle)
          .toBuffer();
      }

      try {
        const { data } = await Tesseract.recognize(imageBuffer, "eng", {
          dpi: 300,
          psm: Tesseract.PSM.AUTO,
          oem: 1,
        });

        rotationResults.push({
          angle: rotation.angle,
          name: rotation.name,
          text: data.text,
          confidence: data.confidence
        });

        console.log(`${rotation.name} - Confidence: ${data.confidence}, Chars: ${data.text.length}`);
        
      } catch (error) {
        console.error(`${rotation.name} OCR failed:`, error.message);
      }
    }
    
  } catch (sharpError) {
    console.log("Sharp not available, skipping rotations");
  }

  // Combine all rotation results
  let rotationText = "";
  rotationResults.forEach(result => {
    if (result.text.trim()) {
      rotationText += `ROTATION ${result.name}:\n${result.text}\n\n`;
    }
  });

  return rotationText;
}

// Helper function to remove duplicate text sections
function removeDuplicateSections(text) {
  const sections = text.split('\n\n');
  const uniqueSections = [];
  const seen = new Set();

  sections.forEach(section => {
    const cleanSection = section.trim();
    if (cleanSection && !seen.has(cleanSection)) {
      seen.add(cleanSection);
      uniqueSections.push(cleanSection);
    }
  });

  return uniqueSections.join('\n\n');
}

// Process with Gemini AI - KEEP ORIGINAL TEXT
async function processWithAI(text) {
  if (!text.trim()) {
    console.error("No text extracted from image");
    return null;
  }

  console.log("\nALL EXTRACTED OCR TEXT:\n", text);
  console.log(`Total text length: ${text.length} characters`);

  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not found in environment variables");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const modelName = "gemini-2.5-flash";

  const prompt = `
You are an AI assistant specialized in extracting timetable data from OCR text.

TASK:
- Extract timetable data from the OCR text below
- Keep ALL original text exactly as shown - DO NOT correct, enhance, or modify any words
- Preserve original abbreviations like "Maths" (do NOT change to "Mathematics")
- Preserve original time formats exactly as shown
- Output ONLY valid JSON in this exact format:

{
  "header": {
    "school": "",
    "class": "", 
    "term": "",
    "teacher": ""
  },
  "timetable": [
    {
      "day": "",
      "time": "",
      "subject": ""
    }
  ]
}

CRITICAL RULES:
1. PRESERVE ORIGINAL TEXT: Keep "Maths" as "Maths", "Sci" as "Sci", etc.
2. PRESERVE TIME FORMATS: Keep time exactly as shown "8:00-9:00", "8-9", etc.
3. EXTRACT AS-IS: Do not correct spelling errors or expand abbreviations
4. MULTI-ORIENTATION: The text contains both horizontal and vertical sections
5. COMBINE DATA: Merge information from all orientations into one structured output
6. EMPTY FIELDS: Use empty strings "" for missing information
7. NO MODIFICATIONS: Do not change any text values from the OCR output

OCR TEXT FROM MULTIPLE ORIENTATIONS:
"""${text}"""
`;

  try {
    console.log("Processing with Gemini AI (preserving original text)...");
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    function extractJSON(rawText) {
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonText = jsonMatch[0];
          const parsed = JSON.parse(jsonText);
          
          // Validate that original text is preserved
          console.log("JSON parsed successfully, validating original text preservation...");
          return parsed;
        }
        throw new Error("No JSON object found in AI response");
      } catch (e) {
        console.error("Failed to parse JSON:", e.message);
        console.log("AI RAW OUTPUT:\n", rawText);
        return rawText;
      }
    }

    const jsonOutput = extractJSON(response.text);
    
    if (jsonOutput) {
      console.log("\nSUCCESS: Structured Data with Original Text:");
      console.log("Header Information:");
      console.log(`   School: "${jsonOutput.header.school}"`);
      console.log(`   Class: "${jsonOutput.header.class}"`);
      console.log(`   Term: "${jsonOutput.header.term}"`);
      console.log(`   Teacher: "${jsonOutput.header.teacher}"`);
      
      console.log(`Timetable Entries: ${jsonOutput.timetable.length}`);
      jsonOutput.timetable.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.day} | ${entry.time} | ${entry.subject}`);
      });
      
      // Save to file
      const outputFile = "./timetable_output.json";
      fs.writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
      console.log(`Output saved to: ${outputFile}`);
      
      return JSON.stringify(jsonOutput, null, 2);
    } else {
      console.error("No valid JSON output generated");
      return null;
    }

  } catch (err) {
    console.error("Gemini AI Error:", err);
    return null;
  }
}

// Alternative: Simple text extraction without AI processing
async function extractRawTextOnly(imagePath) {
  console.log("Extracting raw text only (no AI processing)...");
  
  const { data } = await Tesseract.recognize(imagePath, "eng", {
    dpi: 300,
    psm: Tesseract.PSM.AUTO,
    oem: 1,
  });

  const rawText = data.text;
  
  console.log("\nRAW OCR TEXT ONLY:");
  console.log(rawText);
  console.log(`Characters: ${rawText.length}`);
  
  // Save raw text to file
  const rawOutputFile = "./raw_ocr_text.txt";
  fs.writeFileSync(rawOutputFile, rawText);
  console.log(`Raw text saved to: ${rawOutputFile}`);
  
  return rawText;
}

// Main comprehensive OCR function
async function comprehensiveOCR(imagePath) {
  console.log("Starting comprehensive OCR...");
  
  let finalText = "";

  // Approach 1: Multiple orientations
  console.log("\n--- APPROACH 1: Multiple Orientations ---");
  const orientationText = await extractTextAllOrientations(imagePath);
  finalText += orientationText;

  // Approach 2: Manual rotations
  console.log("\n--- APPROACH 2: Manual Rotations ---");
  const rotationText = await extractWithRotations(imagePath);
  if (rotationText) {
    finalText += rotationText;
  }

  // Remove duplicates while preserving order
  finalText = removeDuplicateSections(finalText);

  console.log(`\nFINAL EXTRACTED TEXT: ${finalText.length} characters`);
  
  return finalText;
}

// Main async function to extract timetable from image
async function extractTextFromImage(imagePath = "./table.png") {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  try {
    console.log("Starting timetable extraction...");
    console.log("Mode: Preserve original text (no enhancements)");
    
    // Option 1: Comprehensive extraction with AI processing
    const extractedText = await comprehensiveOCR(imagePath);
    
    if (!extractedText || extractedText.trim().length < 10) {
      console.error("Very little text extracted, trying simple OCR...");
      const rawText = await extractRawTextOnly(imagePath);
      return {
        success: false,
        message: "Very little text extracted",
        rawText: rawText,
        structuredData: null
      };
    }
    
    // Process with AI while preserving original text
    const structuredData = await processWithAI(extractedText);
    
    console.log("\nExtraction complete!");
    console.log("Original text preserved - no enhancements applied");
    
    return {
      success: true,
      message: "Extraction completed successfully",
      rawText: extractedText,
      structuredData: structuredData ? JSON.parse(structuredData) : null
    };
    
  } catch (error) {
    console.error("Fatal error:", error);
    
    // Final fallback
    try {
      console.log("Attempting fallback simple extraction...");
      const rawText = await extractRawTextOnly(imagePath);
      return {
        success: false,
        message: "Main extraction failed, fallback used",
        rawText: rawText,
        structuredData: null,
        error: error.message
      };
    } catch (fallbackError) {
      console.error("All extraction methods failed");
      return {
        success: false,
        message: "All extraction methods failed",
        rawText: null,
        structuredData: null,
        error: fallbackError.message
      };
    }
  }
}

// Export the main function as default
export default extractTextFromImage;

// Also export individual functions for flexibility
export {
  extractTextFromImage
};