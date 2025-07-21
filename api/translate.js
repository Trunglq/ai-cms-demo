
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
    prompt = `Dịch văn bản sau từ tiếng Anh sang tiếng Việt theo phong cách của VnEconomy - tờ báo tài chính hàng đầu Việt Nam. Yêu cầu chi tiết:

VĂN PHONG VNECONOMY:
- Phong cách chuyên nghiệp, nghiêm túc nhưng dễ tiếp cận
- Câu văn súc tích, rõ ràng, trực tiếp đến vấn đề
- Sử dụng thuật ngữ kinh tế chính xác như VnEconomy
- Tránh văn phong khô khan, academic quá mức
- Balance giữa chuyên môn và dễ hiểu cho business readers

THUẬT NGỮ KINH TẾ - TÀI CHÍNH (THEO VNECONOMY):
- "Tăng trưởng kinh tế" (không phải "tăng trưởng economic")
- "Ngân hàng Nhà nước" (thay vì "ngân hàng trung ương")
- "Thị trường chứng khoán" (không phải "stock market")
- "Doanh nghiệp" (thay vì "công ty" cho business context)
- "Nhà đầu tư" (thay vì "investor")
- "Lạm phát" (inflation), "lãi suất" (interest rate)
- "GDP" giữ nguyên, "CPI" → "chỉ số giá tiêu dùng"
- "Fed" → "Cục Dự trữ Liên bang Mỹ" (lần đầu), sau đó "Fed"

PHONG CÁCH TIÊU ĐỀ VÀ DẪN BÀI:
- Sử dụng động từ mạnh: "tăng vốn", "mở rộng", "đạt được", "ghi nhận"
- Tránh bị động: "Công ty ABC tăng lợi nhuận" thay vì "Lợi nhuận được tăng"
- Numbers và % giữ nguyên format: "tăng 15%", "đạt 2,5 tỷ USD"

CẤU TRÚC VNECONOMY:
- Lead paragraph ngắn gọn, súc tích
- Facts trước, analysis sau
- Quote trực tiếp từ nguồn tin
- Kết luận practical, actionable

QUY CHUẨN VIỆT NAM:
- Chức danh: "Chủ tịch HĐQT", "Tổng giám đốc", "CEO"
- Tiền tệ: "tỷ USD", "triệu USD", "tỷ đồng"
- Thời gian: "quý I/2024", "6 tháng đầu năm"
- Tên công ty: Giữ nguyên tên Anh + "(Tên tiếng Việt nếu có)"

TONE VÀ STYLE:
- Objective nhưng engaging
- Professional nhưng accessible
- Confident trong delivery thông tin
- Avoid sensationalism, stick to facts

Văn bản gốc: ${text}

Dịch theo đúng phong cách VnEconomy - chuyên nghiệp, súc tích, thuật ngữ chính xác. Chỉ trả về bản dịch.`;
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