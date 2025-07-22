export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mode, url, settings } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Content Summary: ${mode} mode for ${url}`);

    let summary;
    if (mode === 'category') {
      summary = await summarizeCategory(url, settings);
    } else if (mode === 'article') {
      summary = await summarizeArticle(url, settings);
    } else {
      return res.status(400).json({ error: 'Invalid mode' });
    }

    res.json({
      summary: summary,
      mode: mode,
      url: url,
      settings: settings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Content Summary Error:', error);
    res.status(500).json({ 
      error: 'Failed to summarize content', 
      details: error.message 
    });
  }
}

// Summarize entire category/section
async function summarizeCategory(categoryUrl, settings) {
  const { length = 'medium', focus = 'general', maxArticles = 10 } = settings;

  console.log(`Summarizing category: ${categoryUrl} with ${maxArticles} articles`);

  // Extract articles from category page
  const articles = await extractCategoryArticles(categoryUrl, maxArticles);
  
  if (articles.length === 0) {
    throw new Error(`Không tìm thấy bài báo nào trong chuyên mục này. URL: ${categoryUrl}. Có thể do: 1) Trang web chặn bot, 2) Cấu trúc HTML thay đổi, 3) URL không hợp lệ. Thử với URL bài viết đơn lẻ thay vì chuyên mục.`);
  }

  console.log(`Found ${articles.length} articles to summarize`);

  // Build comprehensive content from all articles
  const combinedContent = articles.map(article => 
    `**${article.title}**\n${article.content || article.description}\n`
  ).join('\n---\n\n');

  // Generate summary using OpenAI
  const summary = await generateAISummary(combinedContent, {
    type: 'category',
    length: length,
    focus: focus,
    articleCount: articles.length,
    source: categoryUrl
  });

  return summary;
}

// Summarize single article
async function summarizeArticle(articleUrl, settings) {
  const { length = 'short', style = 'paragraph' } = settings;

  console.log(`Summarizing article: ${articleUrl}`);

  // Extract article content (reuse logic from translate-url)
  const articleData = await extractArticleContent(articleUrl);
  
  if (!articleData.content) {
    throw new Error('Không thể trích xuất nội dung từ bài viết này');
  }

  // Generate summary using OpenAI
  const summary = await generateAISummary(articleData.content, {
    type: 'article',
    length: length,
    style: style,
    title: articleData.title,
    source: articleUrl
  });

  return summary;
}

// Extract articles from category page
async function extractCategoryArticles(categoryUrl, maxArticles) {
  const puppeteer = require('puppeteer');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set realistic headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    });

    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for dynamic content and check if page loaded
    await page.waitForTimeout(3000);
    
    // Check if page loaded successfully
    const pageTitle = await page.title();
    console.log(`Page loaded: ${pageTitle}`);
    
    // Check if there are any obvious blocking mechanisms
    const hasBlockingElements = await page.evaluate(() => {
      const blockingSelectors = [
        '.captcha', '[id*="captcha"]', '[class*="captcha"]',
        '.blocked', '[id*="blocked"]', '[class*="blocked"]',
        '.access-denied', '[id*="access"]'
      ];
      
      return blockingSelectors.some(selector => 
        document.querySelector(selector) !== null
      );
    });
    
    if (hasBlockingElements) {
      console.warn('Possible blocking mechanism detected on page');
    }

    // Extract article links and info based on common news sites
    const articles = await page.evaluate((maxArticles, currentUrl) => {
      const articleLinks = [];
      
      // Site-specific selectors based on URL
      let selectors = [];
      
      if (currentUrl.includes('dantri.com')) {
        // DanTri specific selectors
        selectors = [
          '.article-item a[href]',
          '.news-item a[href]',
          '.article-title a[href]',
          '.article h3 a[href]',
          '.story-item a[href]',
          'h3.article-title a',
          'h2.article-title a',
          '.list-news-item a',
          '.news-list-item a',
          'article h3 a',
          'article h2 a',
          '.content-news a[href*="/"]',
        ];
      } else if (currentUrl.includes('vietnamnet.vn')) {
        // VietnamNet specific selectors
        selectors = [
          '.verticalPost a[href]',
          '.horizontalPost a[href]',
          '.story-box a[href]',
          '.news-item a[href]',
          '.article-title a[href]',
          'h3 a[href*="vietnamnet"]',
          'h2 a[href*="vietnamnet"]',
          '.post-title a',
          '.article-box a',
          '.story-item a',
        ];
      } else if (currentUrl.includes('vnexpress.net')) {
        // VnExpress specific selectors
        selectors = [
          '.story a[href*="/"]',
          '.story-item a[href*="/"]', 
          '.item-news a[href*="/"]',
          'h3.title-news a',
          'h2.title-news a',
          'article.item-news a',
        ];
      } else if (currentUrl.includes('tuoitre.vn')) {
        // TuoiTre specific selectors
        selectors = [
          '.list-news-content a[href]',
          '.news-item a[href]',
          'h3 a[href*="tuoitre"]',
          'h2 a[href*="tuoitre"]',
          '.article-title a',
        ];
      } else {
        // Generic fallback selectors
        selectors = [
          'article a[href*="/"]',
          '.story a[href*="/"]',
          '.story-item a[href*="/"]',
          '.article-item a[href*="/"]',
          '.news-item a[href*="/"]',
          '.story-title a',
          '.title-news a',
          'h3 a[href*="/"]',
          'h2 a[href*="/"]',
          '.item-news a',
          '.story a',
        ];
      }

      selectors.forEach((selector, index) => {
        try {
          const links = document.querySelectorAll(selector);
          console.log(`Selector ${index + 1} (${selector}): found ${links.length} links`);
          
          links.forEach(link => {
            const title = link.textContent?.trim();
            let href = link.getAttribute('href');
            
            // Enhanced validation
            if (title && href && title.length > 15 && title.length < 200) {
              // Skip navigation/menu items
              const skipPatterns = [
                'Đăng nhập', 'Đăng ký', 'Trang chủ', 'Liên hệ', 'Giới thiệu',
                'Thể thao', 'Kinh doanh', 'Góc nhìn', 'Video', 'Podcast',
                'Facebook', 'Twitter', 'Youtube', 'Zalo', 'RSS'
              ];
              
              const shouldSkip = skipPatterns.some(pattern => 
                title.toLowerCase().includes(pattern.toLowerCase())
              );
              
              if (!shouldSkip) {
                // Normalize URL
                let fullUrl = href;
                if (href.startsWith('/')) {
                  const baseUrl = new URL(window.location.href).origin;
                  fullUrl = baseUrl + href;
                } else if (href.startsWith('./')) {
                  const baseUrl = new URL(window.location.href).origin;
                  fullUrl = baseUrl + href.substring(1);
                }
                
                // Validate URL format
                try {
                  new URL(fullUrl);
                  
                  // Avoid duplicates and ensure it's a real article
                  if (!articleLinks.some(a => a.url === fullUrl) && 
                      (fullUrl.includes('.htm') || fullUrl.includes('.html') || 
                       fullUrl.match(/\/\d+/) || fullUrl.includes('post-'))) {
                    articleLinks.push({
                      title: title,
                      url: fullUrl,
                      description: title
                    });
                  }
                } catch (urlError) {
                  console.log(`Invalid URL skipped: ${fullUrl}`);
                }
              }
            }
          });
        } catch (selectorError) {
          console.log(`Selector error (${selector}):`, selectorError.message);
        }
      });

      // If no articles found, try aggressive fallback
      if (articleLinks.length === 0) {
        console.log('No articles found with specific selectors, trying fallback...');
        
        // Try any link that looks like an article
        const fallbackLinks = document.querySelectorAll('a[href]');
        fallbackLinks.forEach(link => {
          const title = link.textContent?.trim();
          const href = link.getAttribute('href');
          
          if (title && href && title.length > 20 && title.length < 150) {
            let fullUrl = href;
            if (href.startsWith('/')) {
              const baseUrl = new URL(window.location.href).origin;
              fullUrl = baseUrl + href;
            }
            
            // Check if it looks like an article URL
            if ((fullUrl.includes('.htm') || fullUrl.match(/\/\d+/) || 
                 fullUrl.includes('post-') || fullUrl.includes('bai-viet')) && 
                !articleLinks.some(a => a.url === fullUrl) && 
                !fullUrl.includes('#') && !fullUrl.includes('javascript:')) {
              articleLinks.push({
                title: title,
                url: fullUrl,
                description: title
              });
            }
          }
        });
        
        console.log(`Fallback found ${articleLinks.length} potential articles`);
      }
      
      // Log what selectors are being used
      console.log(`Using ${selectors.length} selectors for ${currentUrl}`);
      console.log('Found articles:', articleLinks.length);

      return articleLinks.slice(0, maxArticles);
    }, maxArticles, categoryUrl);

    console.log(`Extracted ${articles.length} article links from category: ${categoryUrl}`);
    
    // Enhanced logging for debugging
    if (articles.length > 0) {
      console.log('Sample articles found:', articles.slice(0, 3).map(a => a.title));
    } else {
      console.warn('No articles found! This might indicate selector issues.');
    }
    
    return articles;

  } catch (error) {
    console.error('Error extracting category articles:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Extract article content (reuse from translate-url logic)
async function extractArticleContent(url) {
  const { JSDOM } = require('jsdom');
  const { Readability } = require('@mozilla/readability');
  const puppeteer = require('puppeteer');

  try {
    // Try Readability first (fast method)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article && article.textContent && article.textContent.length > 200) {
      return {
        title: article.title || 'Untitled',
        content: article.textContent.trim(),
        url: url
      };
    }

    console.log('Readability failed, trying Puppeteer...');

    // Fallback to Puppeteer for dynamic content
    let browser;
    try {
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Extract content using multiple selectors
      const content = await page.evaluate(() => {
        const selectors = [
          '.fck_detail',           // VnExpress
          '.content-detail',       // DanTri
          '.article-content',      // Generic
          '.post-content',         // Generic
          '.entry-content',        // Generic
          'article .content',      // Generic
          '.detail-content p',     // Generic
        ];

        let extractedContent = '';
        let title = document.title || '';

        // Try each selector
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach(el => {
              extractedContent += el.textContent + '\n';
            });
            break;
          }
        }

        // Clean up title
        title = title.replace(/\s*-\s*.*$/, '').trim();

        return {
          title: title,
          content: extractedContent.trim()
        };
      });

      return {
        ...content,
        url: url
      };

    } finally {
      if (browser) {
        await browser.close();
      }
    }

  } catch (error) {
    console.error(`Error extracting article content from ${url}:`, error);
    throw error;
  }
}

// Generate AI summary using OpenAI
async function generateAISummary(content, options) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const { type, length, focus, style, articleCount, title, source } = options;

  // Build system prompt based on summary type
  let systemPrompt = '';
  let userPrompt = '';

  if (type === 'category') {
    systemPrompt = `Bạn là chuyên gia tóm tắt tin tức với khả năng phân tích và tổng hợp thông tin từ nhiều bài báo.

NHIỆM VỤ: Tóm tắt nội dung của ${articleCount} bài báo từ một chuyên mục báo.

PHONG CÁCH TÓM TẮT:
- Ngôn ngữ rõ ràng, súc tích
- Tập trung vào thông tin chính
- Tránh lặp lại thông tin
- Sử dụng cấu trúc logic

ĐỘ DÀI: ${getLengthSpec(length)}
TRỌNG TÂMM: ${getFocusSpec(focus)}

CẤU TRÚC TÓM TẮT CHUYÊN MỤC:
1. **Tổng quan chung** - Xu hướng chính trong chuyên mục
2. **Các sự kiện nổi bật** - 3-5 sự kiện quan trọng nhất
3. **Phân tích và nhận định** - Đánh giá tác động, ý nghĩa
4. **Kết luận** - Tóm tắt điểm chính cần lưu ý

QUY TẮC:
- Không bịa đặt thông tin không có trong nguồn
- Ưu tiên thông tin có giá trị cao
- Tránh ngôn ngữ cường điệu
- Sử dụng bullet points khi cần thiết`;

    userPrompt = `Hãy tóm tắt nội dung của ${articleCount} bài báo sau từ chuyên mục báo:

${content}

Nguồn: ${source}

Tạo tóm tắt ${length} theo trọng tâm ${focus}.`;

  } else if (type === 'article') {
    systemPrompt = `Bạn là chuyên gia tóm tắt bài báo với khả năng trích xuất thông tin quan trọng nhất.

NHIỆM VỤ: Tóm tắt một bài báo cụ thể.

PHONG CÁCH: ${getStyleSpec(style)}
ĐỘ DÀI: ${getLengthSpec(length)}

CẤU TRÚC TÓM TẮT BÀI BÁO:
${style === 'bullet' ? `
- **Điểm chính 1**: [Thông tin quan trọng nhất]
- **Điểm chính 2**: [Thông tin quan trọng thứ hai]
- **Chi tiết**: [Các thông tin bổ sung]
- **Kết luận**: [Ý nghĩa, tác động]
` : style === 'structured' ? `
**Vấn đề chính**: [Nội dung chính của bài]
**Chi tiết quan trọng**: [Thông tin cụ thể]
**Tác động/Ý nghĩa**: [Đánh giá về ảnh hưởng]
**Kết luận**: [Tóm tắt điểm chính]
` : `
Viết dưới dạng đoạn văn liền mạch, bắt đầu bằng điểm chính, sau đó đi vào chi tiết và kết thúc bằng kết luận.
`}

QUY TẮC:
- Giữ nguyên thông tin chính xác
- Không thêm thông tin không có trong bài gốc
- Sử dụng ngôn ngữ dễ hiểu
- ${length === 'brief' ? 'Chỉ nêu những điểm cực kỳ quan trọng' : 'Bao gồm đầy đủ thông tin quan trọng'}`;

    userPrompt = `Hãy tóm tắt bài báo sau:

**Tiêu đề**: ${title}
**Nội dung**: ${content}

Tạo tóm tắt ${length} theo định dạng ${style}.`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: getMaxTokens(length),
        top_p: 0.9,
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error('OpenAI Summary Error:', error);
    throw error;
  }
}

// Helper functions for prompt building
function getLengthSpec(length) {
  switch (length) {
    case 'brief': return '50-100 từ (siêu ngắn gọn)';
    case 'short': return '150-250 từ (ngắn gọn)';
    case 'medium': return '300-400 từ (vừa phải)';
    case 'long': return '600-800 từ (chi tiết)';
    case 'detailed': return '500+ từ (rất chi tiết)';
    default: return '300-400 từ';
  }
}

function getFocusSpec(focus) {
  switch (focus) {
    case 'general': return 'Tổng quan toàn bộ nội dung';
    case 'highlights': return 'Tập trung vào những điểm nổi bật nhất';
    case 'analysis': return 'Phân tích sâu và đưa ra nhận định';
    default: return 'Tổng quan toàn bộ nội dung';
  }
}

function getStyleSpec(style) {
  switch (style) {
    case 'bullet': return 'Dạng danh sách bullet points với các điểm chính';
    case 'paragraph': return 'Dạng đoạn văn liền mạch, dễ đọc';
    case 'structured': return 'Dạng có cấu trúc rõ ràng với tiêu đề phụ';
    default: return 'Dạng đoạn văn liền mạch';
  }
}

function getMaxTokens(length) {
  switch (length) {
    case 'brief': return 200;
    case 'short': return 400;
    case 'medium': return 600;
    case 'long': return 1000;
    case 'detailed': return 1200;
    default: return 600;
  }
} 