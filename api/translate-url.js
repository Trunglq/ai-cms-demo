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

    // Detect site type for custom extraction
    const hostname = new URL(url).hostname.toLowerCase();
    console.log(`Processing site: ${hostname}`);

    // Extract article content using common selectors
    let title = '';
    let content = '';

    // Site-specific extraction logic
    if (hostname.includes('vnexpress')) {
      // VnExpress specific extraction
      title = $('h1.title-detail').text().trim() || $('h1').first().text().trim();
      content = $('.fck_detail').text().trim() || $('.sidebar_1 .fck_detail').text().trim();
      console.log('VnExpress extraction:', { titleLength: title.length, contentLength: content.length });
    } else if (hostname.includes('vietnamnet')) {
      // VietnamNet specific extraction
      title = $('.ArticleTitle').text().trim() || $('.detail-title h1').text().trim() || $('.maincontent h1').text().trim();
      content = $('.ArticleContent').text().trim() || $('.maincontent .ArticleContent').text().trim() || $('.detail-content-body').text().trim();
      console.log('VietnamNet extraction:', { titleLength: title.length, contentLength: content.length });
    } else if (hostname.includes('vneconomy')) {
      // VnEconomy specific extraction
      title = $('.detail-title').text().trim() || $('.article-header h1').text().trim() || $('.entry-header h1').text().trim();
      content = $('.detail-content .content').text().trim() || $('.article-content .content').text().trim() || $('.post-content-inner').text().trim();
      console.log('VnEconomy extraction:', { titleLength: title.length, contentLength: content.length });
    } else if (hostname.includes('zing')) {
      // Zing News specific extraction
      title = $('.the-article-header h1').text().trim() || $('.article-header .title').text().trim();
      content = $('.the-article-body').text().trim() || $('.article-body .content').text().trim() || $('.inner-article').text().trim();
      console.log('Zing extraction:', { titleLength: title.length, contentLength: content.length });
    } else if (hostname.includes('dantri')) {
      // Dan Tri specific extraction
      title = $('.dt-news__title').text().trim() || $('.e-magazine__title').text().trim();
      content = $('.dt-news__content').text().trim() || $('.e-magazine__body').text().trim() || $('.singular-content').text().trim();
      console.log('Dan Tri extraction:', { titleLength: title.length, contentLength: content.length });
    } else if (hostname.includes('24h')) {
      // 24h specific extraction
      title = $('.cate-24h-arti-title').text().trim() || $('.title-news').text().trim();
      content = $('.cate-24h-arti-txt-deta').text().trim() || $('.cate-24h-foot-arti-deta-info').text().trim();
      console.log('24h extraction:', { titleLength: title.length, contentLength: content.length });
    }

    console.log(`After site-specific extraction: title="${title.substring(0, 100)}", content length=${content.length}`);

    // If site-specific extraction didn't work, use generic extraction
    if (!title) {
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
        'h1.title',
        // VietnamNet specific
        '.ArticleTitle',             // VietnamNet
        '.detail-title h1',          // VietnamNet
        '.maincontent h1',           // VietnamNet
        // VnEconomy specific
        '.detail-title',             // VnEconomy
        '.article-header h1',        // VnEconomy
        '.entry-header h1',          // VnEconomy
        // Zing News
        '.the-article-header h1',    // Zing News
        '.article-header .title',    // Zing News
        // Dan Tri
        '.dt-news__title',           // Dan Tri
        '.e-magazine__title',        // Dan Tri
        // 24h.com.vn
        '.cate-24h-arti-title',      // 24h
        '.title-news',               // 24h
        // More generic
        '.page-title',
        '.content-title',
        '.main-title'
      ];

      for (const selector of titleSelectors) {
        const titleElement = $(selector).first();
        if (titleElement.length && titleElement.text().trim()) {
          title = titleElement.text().trim();
          console.log(`Found title with selector: ${selector}`);
          break;
        }
      }
    }

    if (!content || content.length < 100) {
      console.log('Starting generic content extraction...');
      
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
        // VietnamNet specific
        '.ArticleContent',           // VietnamNet main
        '.maincontent .ArticleContent', // VietnamNet alternative
        '.detail-content-body',      // VietnamNet 
        '.content-article-detail',   // VietnamNet
        // VnEconomy specific  
        '.detail-content .content',  // VnEconomy
        '.article-content .content', // VnEconomy alternative
        '.entry-content .content',   // VnEconomy
        '.post-content-inner',       // VnEconomy
        // Zing News
        '.the-article-body',         // Zing News
        '.article-body .content',    // Zing News
        '.inner-article',            // Zing News
        // Dan Tri
        '.dt-news__content',         // Dan Tri
        '.e-magazine__body',         // Dan Tri
        '.singular-content',         // Dan Tri
        // 24h.com.vn
        '.cate-24h-foot-arti-deta-info', // 24h
        '.cate-24h-arti-txt-deta',   // 24h
        // Cafe F
        '.detail-content .content-detail', // Cafe F
        '.knswli-detail-content',    // Cafe F
        // Generic patterns
        'article .content',
        '.main-content .content',
        '.article-wrapper .content',
        '#content-detail',
        '.content-article',
        '.post-entry',
        '.entry-body',
        '.article-text',
        '.news-body',
        '.story-content'
      ];

      for (const selector of contentSelectors) {
        const contentElement = $(selector);
        if (contentElement.length) {
          const extracted = contentElement.text().trim();
          console.log(`Trying selector "${selector}": found ${extracted.length} chars`);
          if (extracted.length > 100) { // Only accept if substantial content
            content = extracted;
            console.log(`SUCCESS: Using selector "${selector}" with ${content.length} characters`);
            break;
          }
        }
      }
    }

    // Enhanced fallback: try to get paragraphs with more specific targeting
    if (!content || content.length < 100) {
      console.log('Using enhanced paragraph fallback for content extraction...');
      
      // Remove unwanted elements first
      $('script, style, nav, header, footer, .advertisement, .ads, .social-share, .related-news, .sidebar, .comment, .tag, .category-list').remove();
      
      // Try different paragraph extraction strategies
      const fallbackSelectors = [
        // Generic article patterns
        'article p',
        'main p', 
        '.content p',
        '.detail p',
        '.article p',
        '.post p',
        // Vietnamese specific patterns
        'div[class*="content"] p',
        'div[class*="detail"] p',
        'div[class*="article"] p',
        'div[class*="body"] p',
        'div[class*="text"] p',
        // Site-specific fallbacks
        '.maincontent p',            // VietnamNet
        '.ArticleContent p',         // VietnamNet
        '.detail-content p',         // VnEconomy, others
        '.the-article-body p',       // Zing
        '.dt-news__content p',       // Dan Tri
        '.singular-content p',       // Dan Tri
        '.cate-24h-arti-txt-deta p', // 24h
        '.knswli-detail-content p',  // Cafe F
        // More generic
        '.entry p',
        '.story p',
        '.news p',
        '#content p',
        // Very broad fallbacks
        'p'  // All paragraphs as last resort
      ];
      
      for (const selector of fallbackSelectors) {
        const paragraphs = $(selector).map((i, el) => {
          const text = $(el).text().trim();
          // Filter out navigation, ads, short texts
          if (text.length < 30) return null; // Increased minimum length
          if (text.includes('Theo ') && text.length < 50) return null; // Skip source attribution
          if (text.includes('Tags:') || text.includes('Từ khóa:')) return null;
          if (text.includes('Chia sẻ:') || text.includes('Share:')) return null;
          if (text.match(/^\d+\/\d+\/\d+/)) return null; // Skip dates
          if (text.includes('Xem thêm:') || text.includes('Liên quan:')) return null;
          return text;
        }).get().filter(Boolean);
        
        console.log(`Selector "${selector}": found ${paragraphs.length} valid paragraphs`);
        
        if (paragraphs.length >= 2) { // Need at least 2 substantial paragraphs
          content = paragraphs.join('\n\n');
          console.log(`SUCCESS: Found content using selector: ${selector}, paragraphs: ${paragraphs.length}, total length: ${content.length}`);
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