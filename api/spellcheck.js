
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

Trả về văn bản đã được kiểm tra và sửa lỗi theo chuẩn báo chí.`;

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
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const correctedText = data.choices[0].message.content;

    res.status(200).json({ correctedText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check spelling' });
  }
}; 