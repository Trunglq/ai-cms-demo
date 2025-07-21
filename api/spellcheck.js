
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, language = 'vi' } = req.body; // Default to Vietnamese
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const langText = language === 'vi' ? 'tiếng Việt' : 'tiếng Anh';
  const prompt = `Kiểm tra và sửa lỗi chính tả, ngữ pháp trong văn bản ${langText} theo chuẩn báo chí. Yêu cầu:

${language === 'vi' ? 
`- Tuân thủ quy chuẩn chính tả và ngữ pháp báo chí Việt Nam
- Sử dụng thuật ngữ báo chí chính xác và phù hợp
- Văn phong khách quan, súc tích, chuyên nghiệp
- Cấu trúc câu rõ ràng, dễ hiểu cho độc giả
- Sử dụng dấu câu đúng chuẩn báo chí Việt Nam` :
`- Follow international journalism writing standards (AP Style/Reuters)
- Use appropriate journalistic terminology and professional language
- Maintain objective, concise, and professional tone
- Ensure clear sentence structure for readers
- Use proper punctuation according to journalism standards`}

Văn bản gốc: ${text}

Hãy trả về kết quả theo định dạng JSON với 3 phần:
1. "original": văn bản gốc
2. "corrected": văn bản đã sửa lỗi theo chuẩn báo chí
3. "changes": mảng các thay đổi, mỗi item có format {"from": "text cũ", "to": "text mới", "reason": "lý do sửa"}

Ví dụ format trả về:
{
  "original": "văn bản gốc",
  "corrected": "văn bản đã sửa", 
  "changes": [
    {"from": "từ sai", "to": "từ đúng", "reason": "lỗi chính tả"},
    {"from": "câu sai ngữ pháp", "to": "câu đúng ngữ pháp", "reason": "sửa ngữ pháp"}
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
        original: parsedResult.original || text,
        corrected: parsedResult.corrected,
        changes: parsedResult.changes || []
      });
    } catch (parseError) {
      // Fallback if JSON parsing fails
      res.status(200).json({
        original: text,
        corrected: responseContent,
        changes: []
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check spelling' });
  }
}; 