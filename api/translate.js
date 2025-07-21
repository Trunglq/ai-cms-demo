
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, direction = 'en-vi' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  let prompt = '';
  if (direction === 'en-vi') {
    prompt = `Dịch văn bản sau từ tiếng Anh sang tiếng Việt theo chuẩn báo chí. Yêu cầu:
- Sử dụng văn phong báo chí: khách quan, chính xác, súc tích
- Tuân thủ quy chuẩn ngôn ngữ báo chí Việt Nam
- Sử dụng thuật ngữ phù hợp với lĩnh vực (nếu có)
- Đảm bảo tính chuyên nghiệp và dễ hiểu cho độc giả

Văn bản gốc: ${text}`;
  } else if (direction === 'vi-en') {
    prompt = `Dịch văn bản sau từ tiếng Việt sang tiếng Anh theo chuẩn báo chí quốc tế. Yêu cầu:
- Sử dụng văn phong báo chí: khách quan, chính xác, súc tích
- Tuân thủ chuẩn ngôn ngữ báo chí tiếng Anh (AP Style/Reuters)
- Sử dụng thuật ngữ chuyên ngành phù hợp
- Đảm bảo tính chuyên nghiệp và dễ hiểu cho độc giả quốc tế

Văn bản gốc: ${text}`;
  } else {
    return res.status(400).json({ error: 'Invalid direction' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

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
    const translatedText = data.choices[0].message.content;

    res.status(200).json({ translatedText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to translate text' });
  }
}; 