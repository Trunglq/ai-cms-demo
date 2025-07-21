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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
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
    const titleSelectors = [
      'h1', 
      '.headline', 
      '.title', 
      '.article-title', 
      '[data-testid="headline"]', 
      'h1.story-title',
      // Vietnamese sites
      'h1.title-detail',           // VnExpress
      '.title_news_detail h1',     // Tuoi Tre
      '.article-title h1',         // Thanh Nien
      '.entry-title',              // Generic WordPress
      '.post-title',
      '.news-title',
      'h1.title'
    ];
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
      '.StoryBodyCompanionColumn',
      // Vietnamese sites specific
      '.fck_detail',               // VnExpress main content
      '.sidebar_1 .fck_detail',    // VnExpress alternative
      '.content_detail',           // Generic Vietnamese
      '.detail-content',           // Tuoi Tre, Thanh Nien
      '.article-content-detail',   // Some Vietnamese sites
      '.news-content',
      '.post-body',
      '.entry-content',
      // More generic fallbacks
      'article .content',
      '.main-content .content',
      '.article-wrapper .content',
      '#content-detail',
      '.content-article'
    ];

    for (const selector of contentSelectors) {
      const contentElement = $(selector);
      if (contentElement.length) {
        content = contentElement.text().trim();
        if (content.length > 100) { // Only accept if substantial content
          break;
        }
      }
    }

    // Enhanced fallback: try to get paragraphs with more specific targeting
    if (!content || content.length < 100) {
      console.log('Using enhanced fallback for content extraction...');
      
      // Remove unwanted elements first
      $('script, style, nav, header, footer, .advertisement, .ads, .social-share, .related-news').remove();
      
      // Try different paragraph extraction strategies
      const fallbackSelectors = [
        'article p',
        'main p', 
        '.content p',
        '.detail p',
        '.article p',
        '.post p',
        'div[class*="content"] p',
        'div[class*="detail"] p',
        'div[class*="article"] p'
      ];
      
      for (const selector of fallbackSelectors) {
        const paragraphs = $(selector).map((i, el) => {
          const text = $(el).text().trim();
          return text.length > 20 ? text : null; // Filter out short paragraphs
        }).get().filter(Boolean);
        
        if (paragraphs.length > 2) { // Need at least 3 substantial paragraphs
          content = paragraphs.join('\n\n');
          break;
        }
      }
    }

    // Final fallback: get all text from main content areas
    if (!content || content.length < 100) {
      console.log('Using final fallback...');
      const mainContent = $('main, article, .main, .content, .detail').first();
      if (mainContent.length) {
        // Remove unwanted elements
        mainContent.find('script, style, nav, .advertisement, .ads, .social-share, .related-news, .tags, .category').remove();
        content = mainContent.text().trim();
      }
    }

    // Clean content more thoroughly
    content = content
      .replace(/\s+/g, ' ')                    // Multiple spaces to single
      .replace(/\n\s*\n\s*\n/g, '\n\n')       // Multiple newlines to double
      .replace(/^\s+|\s+$/g, '')              // Trim start/end
      .replace(/\t/g, ' ')                     // Tabs to spaces
      .trim();

    console.log(`Extracted content length: ${content.length}`);
    console.log(`Title: ${title}`);
    console.log(`Content preview: ${content.substring(0, 200)}...`);

    if (!content || content.length < 100) {
      return res.status(400).json({ 
        error: 'Could not extract sufficient article content from URL',
        details: `Only extracted ${content.length} characters. The site may have anti-scraping protection or unusual structure.`,
        extractedTitle: title,
        extractedPreview: content.substring(0, 200)
      });
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