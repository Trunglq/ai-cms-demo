const cheerio = require('cheerio');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, direction = 'en-vi' } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Fetch article content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract article content using common selectors
    let title = '';
    let content = '';

    // Try different title selectors
    const titleSelectors = ['h1', '.headline', '.title', '.article-title', '[data-testid="headline"]', 'h1.story-title'];
    for (const selector of titleSelectors) {
      const titleElement = $(selector).first();
      if (titleElement.length && titleElement.text().trim()) {
        title = titleElement.text().trim();
        break;
      }
    }

    // Try different content selectors
    const contentSelectors = [
      '.article-body',
      '.story-body',
      '.post-content',
      '.entry-content',
      '.article-content',
      '[data-testid="article-body"]',
      '.ArticleBody',
      '.StoryBodyCompanionColumn'
    ];

    for (const selector of contentSelectors) {
      const contentElement = $(selector);
      if (contentElement.length) {
        content = contentElement.text().trim();
        break;
      }
    }

    // Fallback: try to get paragraphs within article/main
    if (!content) {
      const paragraphs = $('article p, main p, .content p').map((i, el) => $(el).text().trim()).get();
      content = paragraphs.join('\n\n');
    }

    // Clean content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    if (!content) {
      return res.status(400).json({ error: 'Could not extract article content from URL' });
    }

    // Limit content length for API
    const maxLength = 3000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }

    // Prepare translation prompt
    let prompt = '';
    if (direction === 'en-vi') {
      prompt = `Dịch bài báo sau từ tiếng Anh sang tiếng Việt theo phong cách của VnEconomy - tờ báo tài chính hàng đầu Việt Nam. 

VĂN PHONG VNECONOMY:
- Phong cách chuyên nghiệp, nghiêm túc nhưng dễ tiếp cận
- Câu văn súc tích, rõ ràng, trực tiếp đến vấn đề
- Sử dụng thuật ngữ kinh tế chính xác như VnEconomy
- Balance giữa chuyên môn và dễ hiểu cho business readers

THUẬT NGỮ KINH TẾ - TÀI CHÍNH (THEO VNECONOMY):
- "Tăng trưởng kinh tế", "Ngân hàng Nhà nước", "Thị trường chứng khoán"
- "Doanh nghiệp" (business context), "Nhà đầu tư"
- "Fed" → "Cục Dự trữ Liên bang Mỹ" (lần đầu), sau đó "Fed"

${title ? `TIÊU ĐỀ: ${title}\n\n` : ''}NỘI DUNG BÀI BÁAO: ${content}

Hãy dịch toàn bộ bài báo theo phong cách VnEconomy. Trả về format:
TIÊU ĐỀ: [tiêu đề đã dịch]
NỘI DUNG: [nội dung đã dịch]`;
    } else {
      prompt = `Translate the following Vietnamese article to English following international journalism standards:

${title ? `TITLE: ${title}\n\n` : ''}CONTENT: ${content}

Return format:
TITLE: [translated title]
CONTENT: [translated content]`;
    }

    // Call OpenAI API
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const translatedText = aiData.choices[0].message.content;

    // Parse response
    const lines = translatedText.split('\n');
    let translatedTitle = '';
    let translatedContent = '';
    
    let isContent = false;
    for (const line of lines) {
      if (line.startsWith('TIÊU ĐỀ:') || line.startsWith('TITLE:')) {
        translatedTitle = line.replace(/^(TIÊU ĐỀ:|TITLE:)\s*/, '').trim();
      } else if (line.startsWith('NỘI DUNG:') || line.startsWith('CONTENT:')) {
        isContent = true;
        translatedContent = line.replace(/^(NỘI DUNG:|CONTENT:)\s*/, '').trim();
      } else if (isContent) {
        translatedContent += '\n' + line;
      }
    }

    // Fallback if parsing fails
    if (!translatedTitle && !translatedContent) {
      translatedContent = translatedText;
    }

    res.status(200).json({
      originalUrl: url,
      originalTitle: title,
      originalContent: content.substring(0, 500) + '...', // Preview only
      translatedTitle: translatedTitle || title,
      translatedContent: translatedContent.trim(),
      direction
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      error: 'Failed to translate URL', 
      details: error.message 
    });
  }
}; 