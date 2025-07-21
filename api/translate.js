
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
    prompt = `Dịch văn bản sau từ tiếng Anh sang tiếng Việt theo chuẩn báo chí Việt Nam chuyên nghiệp. Yêu cầu chi tiết:

PHONG CÁCH VÀ VĂN PHONG:
- Sử dụng văn phong báo chí: khách quan, chính xác, súc tích, trang trọng
- Tránh ngôn ngữ thông tục, lóng, hoặc quá văn học
- Câu văn rõ ràng, logic, dễ hiểu cho đại chúng
- Sử dụng câu chủ động thay vì câu bị động khi có thể

QUY CHUẨN BÁOE CHÍ VIỆT NAM:
- Tuân thủ chính tả và ngữ pháp chuẩn tiếng Việt
- Sử dụng thuật ngữ báo chí chính xác (ví dụ: "tuyên bố" thay vì "nói", "khẳng định" thay vì "bảo")
- Danh xưng và chức danh chính xác (Tổng thống, Thủ tướng, Chủ tịch...)
- Đơn vị tiền tệ, thời gian theo chuẩn Việt Nam

THUẬT NGỮ CHUYÊN NGÀNH:
- Kinh tế: GDP, lạm phát, lãi suất, chứng khoán...
- Chính trị: quốc hội, chính phủ, ngoại giao, luật pháp...
- Xã hội: giáo dục, y tế, môi trường, an sinh...
- Công nghệ: AI, blockchain, internet, mạng xã hội...

CẤU TRÚC VÀ LOGIC:
- Giữ nguyên ý nghĩa và tone gốc
- Đảm bảo tính nhất quán trong thuật ngữ
- Cấu trúc câu phù hợp với thói quen đọc của người Việt
- Sử dụng dấu câu đúng chuẩn báo chí

Văn bản gốc: ${text}

Chỉ trả về phần dịch, không giải thích thêm.`;
  } else if (direction === 'vi-en') {
    prompt = `Translate the following Vietnamese text to English following international journalism standards. Detailed requirements:

STYLE AND TONE:
- Use professional journalism style: objective, accurate, concise, formal
- Avoid colloquialisms, slang, or overly literary language
- Clear, logical sentences that are accessible to general readers
- Prefer active voice over passive voice when possible

INTERNATIONAL JOURNALISM STANDARDS:
- Follow AP Style/Reuters guidelines for consistency
- Use standard journalism terminology (e.g., "stated" not "said", "announced" not "told")
- Proper titles and designations (President, Prime Minister, Chairman...)
- Standard international units, time formats, currency

SPECIALIZED TERMINOLOGY:
- Economics: GDP, inflation, interest rates, stock market...
- Politics: parliament, government, diplomacy, legislation...
- Society: education, healthcare, environment, social welfare...
- Technology: AI, blockchain, internet, social media...

STRUCTURE AND LOGIC:
- Maintain original meaning and tone
- Ensure terminology consistency throughout
- Sentence structure suitable for international readers
- Proper punctuation according to journalism standards
- Cultural context adaptation for global audience

Original text: ${text}

Return only the translation, no explanations.`;
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