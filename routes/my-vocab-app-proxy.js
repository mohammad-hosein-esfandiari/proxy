const express = require("express");
const router = express.Router();
const axios = require("axios");
const ModelClient = require("@azure-rest/ai-inference").default;
const { AzureKeyCredential } = require("@azure/core-auth");
const { isUnexpected } = require("@azure-rest/ai-inference");


// Validation helper
const isValidWord = (word) => {
  return typeof word === "string" && /^[a-zA-Z\-]{1,40}$/.test(word);
};

// Route: GET /api/proxy/my-vocab-app?word=example
router.get("/proxy/my-vocab-app", async (req, res) => {
  const word = req.query.word;

  // 1. Validation
  if (!word || !isValidWord(word)) {
    return res.status(400).json({
      status: "error",
      statusCode: 400,
      message: "Invalid or missing 'word' query parameter. It must be alphabetic and 1-40 characters long.",
    });
  }

  // 2. Setup
  const token = process.env.AZURE_API_KEY;
  const endpoint = process.env.AZURE_ENDPOINT;
  const model = process.env.AZURE_MODEL;

  if (!token || !endpoint || !model) {
    return res.status(500).json({
      status: "error",
      statusCode: 500,
      message: "Server configuration error. Missing Azure credentials.",
    });
  }

  try {
    // 3. Request to Azure AI

    // this api has 150 request per day limit
    const client = ModelClient(endpoint, new AzureKeyCredential(token));

    const question = `
    Check if the English word "${word}" is spelled correctly. If yes, respond with correct: true. If not, respond with correct: false and do not provide meaning or examples.
    
    If the word is correct, provide:
    - The part of speech (type of the word) in Persian (e.g. اسم، فعل، صفت).
    - A short Persian meaning.
    - 3 English example sentences with Persian translations.
    
    Also, generate a quiz object with:
    - A Persian question asking for the meaning of the word.
    - The original word as "word".
    - An array of 4 options, each as an object with:
      - "id": a unique option ID (e.g. "a", "b", "c", "d")
      - "text": the Persian text of the option
    - A field "answer" that contains only the correct option's id.
    
    Respond strictly in the following JSON format:
    
    {
      "word": "${word}",
      "correct": true,
      "partOfSpeech": "اسم", // or فعل, صفت, ...
      "meaning": "...",
      "examples": [
        { "english": "Example 1", "persian": "مثال ۱" },
        { "english": "Example 2", "persian": "مثال ۲" },
        { "english": "Example 3", "persian": "مثال ۳" }
      ],
      "quiz": {
        "question": "معنای کلمه «${word}» چیست؟",
        "word": "${word}",
        "options": [
          { "id": "a", "text": "گزینه ۱" },
          { "id": "b", "text": "گزینه ۲" },
          { "id": "c", "text": "گزینه ۳" },
          { "id": "d", "text": "گزینه ۴" }
        ],
        "answer": "c"
      }
    }
    
    If the word is not spelled correctly, just respond:
    
    {
      "word": "${word}",
      "correct": false
    }
    `;
    
    

    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          { role: "system", content: "" },
          { role: "user", content: question },
        ],
        temperature: 0.7,
        top_p: 1,
        model: model,
      },
    });

    if (isUnexpected(response)) {
      return res.status(502).json({
        status: "error",
        statusCode: 502,
        message: "Unexpected error from the AI inference service.",
      });
    }

    const content = response.body.choices?.[0]?.message?.content;

    let aiData;
    try {
      aiData = JSON.parse(content);
    } catch (parseError) {
      return res.status(502).json({
        status: "error",
        statusCode: 502,
        message: "Invalid response format from AI model.",
      });
    }

    // 4. If incorrect word, skip dictionary
    if (!aiData.correct) {
      return res.status(200).json({
        status: "success",
        statusCode: 200,
        data: aiData,
      });
    }

    // 5. Fetch from Dictionary API
    let dictData = {};
    try {
      const dictRes = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const dict = dictRes.data[0];

      dictData.phonetic = dict.phonetic || dict.phonetics?.[0]?.text || "";
      dictData.audio = dict.phonetics?.find(p => p.audio)?.audio || "";
    

    } catch (dictError) {
      console.warn(`Dictionary API failed for '${word}':`, dictError.message);
      dictData = { phonetic: "", audio: "" }; // fallback
    }

    // 6. Final response
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      data: {
        ...aiData,
        phonetic: dictData.phonetic,
        audio: dictData.audio,
        
      },
    });

  } catch (error) {
    console.error("AI request failed:", error);
    return res.status(500).json({
      status: "error",
      statusCode: 500,
      message: "An error occurred while processing the request.",
    });
  }
});

module.exports = router;
