
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, language = 'vi', mode = 'conservative' } = req.body; // Add mode option
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const langText = language === 'vi' ? 'tiếng Việt' : 'tiếng Anh';
  
  // Updated prompt focusing on real errors vs suggestions
  const prompt = `Bạn là chuyên gia kiểm tra chính tả ${langText} cho báo chí. QUAN TRỌNG:

🎯 CHỈ BÁO CÁO LỖI THỰC SỰ:
${language === 'vi' ? 
`- Lỗi chính tả rõ ràng (viết sai từ)
- Lỗi ngữ pháp nghiêm trọng (sai cấu trúc câu)
- Lỗi dấu câu cơ bản
- KHÔNG sửa từ đồng nghĩa (ví dụ: "đứng đầu" và "dẫn đầu" đều đúng)
- KHÔNG thay đổi phong cách viết của tác giả
- KHÔNG cải thiện văn phong nếu không có lỗi rõ ràng` :
`- Clear spelling errors (misspelled words)
- Serious grammatical errors (wrong sentence structure)  
- Basic punctuation errors
- DO NOT change synonyms or stylistic choices
- DO NOT alter author's writing style
- DO NOT improve unless there are clear errors`}

📝 PHÂN LOẠI KẾT QUẢ:
- "errors": Lỗi thực sự CẦN phải sửa
- "suggestions": Gợi ý cải thiện (tùy chọn)
- Nếu văn bản KHÔNG có lỗi thực sự → trả về "errors": []

Văn bản cần kiểm tra: "${text}"

Trả về JSON format:
{
  "hasErrors": boolean,
  "original": "văn bản gốc",
  "corrected": "văn bản đã sửa chỉ những LỖI THỰC SỰ",
  "errors": [
    {"from": "lỗi rõ ràng", "to": "sửa đúng", "type": "spelling|grammar|punctuation", "reason": "lý do cụ thể"}
  ],
  "suggestions": [
    {"from": "có thể cải thiện", "to": "gợi ý", "type": "style|clarity", "reason": "lý do gợi ý"}
  ]
}

Ví dụ: Nếu "đứng đầu" và "dẫn đầu" đều đúng → KHÔNG sửa.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices[0].message.content;
    
    try {
      const parsedResult = JSON.parse(responseContent);
      res.status(200).json({
        hasErrors: parsedResult.hasErrors || false,
        original: parsedResult.original || text,
        corrected: parsedResult.corrected,
        errors: parsedResult.errors || [],
        suggestions: parsedResult.suggestions || [],
        // Legacy support for existing frontend
        changes: [...(parsedResult.errors || []), ...(parsedResult.suggestions || [])]
      });
    } catch (parseError) {
      // Fallback if JSON parsing fails
      res.status(200).json({
        hasErrors: false,
        original: text,
        corrected: responseContent,
        errors: [],
        suggestions: [],
        changes: []
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check spelling' });
  }
}; 