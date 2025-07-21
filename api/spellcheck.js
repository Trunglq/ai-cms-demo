
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
  const prompt = `Bạn là chuyên gia kiểm tra chính tả ${langText} cho báo chí. SIÊU QUAN TRỌNG:

🚫 TUYỆT ĐỐI KHÔNG ĐƯỢC:
- Sửa từ ĐÚNG thành từ SAI (ví dụ: "vườn tôm" ĐÚNG rồi, KHÔNG sửa thành "vuông tôm")
- Sửa các từ chuyên ngành thuỷ sản, nông nghiệp nếu đã đúng
- Thay đổi tên riêng, địa danh có sẵn

✅ CHỈ SỬA KHI:
${language === 'vi' ? 
`- Chính tả SAI RÕ RÀNG: "tua gạch" → "cua gạch" (động vật có đúng tên)
- Ngữ pháp SAI: thiếu dấu, sai cấu trúc câu
- Thông tin thực tế SAI: chức vụ, tên người nổi tiếng
- Lỗi đánh máy rõ ràng` :
`- OBVIOUS spelling mistakes: clearly misspelled words
- Grammar errors: missing punctuation, wrong structure
- Factual errors: wrong titles, famous names
- Clear typos`}

🎯 ĐẶC BIỆT CHÚ Ý:
- "vườn tôm", "cua gạch", "quảng canh" là thuật ngữ ĐÚNG
- Kiểm tra chức vụ chính trị: "chủ tịch nước" vs "tổng bí thư"
- KHÔNG sửa khi không chắc chắn 100%

📝 PHÂN LOẠI:
- "errors": Lỗi thực sự PHẢI sửa
- "suggestions": Gợi ý (ít dùng, chỉ khi rõ ràng)

Văn bản: "${text}"

JSON format:
{
  "hasErrors": boolean,
  "original": "văn bản gốc", 
  "corrected": "chỉ sửa LỖI THỰC SỰ",
  "errors": [
    {"from": "SAI rõ ràng", "to": "ĐÚNG chắc chắn", "type": "spelling|grammar|factual", "reason": "lý do cụ thể"}
  ],
  "suggestions": [
    {"from": "có thể cải thiện", "to": "gợi ý", "type": "style|clarity", "reason": "lý do"}
  ]
}`;

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