const cheerio = require('cheerio');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, direction } = req.body;

    if (!url || !direction) {
      return res.status(400).json({ error: 'URL and direction are required' });
    }

    console.log(`Processing URL: ${url} with direction: ${direction}`);

    // Try advanced crawler first for Vietnamese sites
    const hostname = new URL(url).hostname.toLowerCase();
    const isVietnameseSite = hostname.includes('vnexpress') || 
                           hostname.includes('vietnamnet') || 
                           hostname.includes('vneconomy') || 
                           hostname.includes('zingnews') || 
                           hostname.includes('dantri') || 
                           hostname.includes('24h.com') ||
                           hostname.includes('thanhnien') ||
                           hostname.includes('tuoitre') ||
                           hostname.includes('vietnamplus');

    let title = '';
    let content = '';

    if (isVietnameseSite) {
      console.log('Vietnamese site detected, using advanced crawler...');
      try {
        const crawledData = await advancedCrawler(url, hostname);
        title = crawledData.title;
        content = crawledData.content;
        console.log(`Advanced crawler result: title=${title.length} chars, content=${content.length} chars`);
      } catch (crawlerError) {
        console.log('Advanced crawler failed, falling back to basic extraction:', crawlerError.message);
      }
    }

    // Fallback to basic extraction if advanced crawler failed or for non-Vietnamese sites
    if (!content || content.length < 100) {
      console.log('Using basic extraction fallback...');
      const basicData = await basicExtraction(url, hostname);
      title = title || basicData.title;
      content = content || basicData.content;
    }

    if (!title && !content) {
      return res.status(400).json({ 
        error: 'Không thể trích xuất nội dung từ URL này. Vui lòng thử URL khác.' 
      });
    }

    // Translate the content
    console.log('Starting translation...');
    const translatedTitle = title ? await translateText(title, direction) : '';
    const translatedContent = content ? await translateText(content, direction) : '';

    res.json({
      original: {
        title: title,
        content: content
      },
      translated: {
        title: translatedTitle,
        content: translatedContent
      }
    });

  } catch (error) {
    console.error('Error in translate-url:', error);
    res.status(500).json({ error: 'Lỗi server khi xử lý URL' });
  }
}

// Advanced crawler using Puppeteer for Vietnamese sites
async function advancedCrawler(url, hostname) {
  const puppeteer = require('puppeteer');
  
  let browser;
  try {
    console.log('Launching Puppeteer browser...');
    
    // Configure Puppeteer for Vercel serverless
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    });

    const page = await browser.newPage();
    
    // Set realistic user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    
    // Block images and unnecessary resources to speed up
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log(`Navigating to: ${url}`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    console.log('Extracting content with site-specific selectors...');
    
    const result = await page.evaluate((hostname) => {
      let title = '';
      let content = '';

      // Site-specific extraction logic
      if (hostname.includes('vnexpress')) {
        // VnExpress selectors
        const titleSelectors = [
          'h1.title-detail',
          '.title-detail h1',
          'h1.title_news_detail',
          '.container h1',
          'h1'
        ];
        
        const contentSelectors = [
          '.fck_detail',
          '.sidebar_1 .fck_detail',
          '.Normal',
          'article .fck_detail',
          '.content_detail .Normal'
        ];

        // Extract title
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }

        // Extract content
        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            // Get all paragraphs
            const paragraphs = Array.from(el.querySelectorAll('p')).map(p => p.textContent.trim()).filter(text => text.length > 20);
            if (paragraphs.length > 0) {
              content = paragraphs.join('\n\n');
              break;
            }
          }
        }
      } 
      else if (hostname.includes('vietnamnet')) {
        // VietnamNet selectors
        const titleSelectors = [
          '.ArticleTitle',
          '.detail-title h1',
          '.maincontent h1',
          '.content-detail h1',
          'h1.title',
          'h1'
        ];
        
        const contentSelectors = [
          '.ArticleContent',
          '.maincontent .ArticleContent',
          '.detail-content-body',
          '.content-article-detail',
          '.article-content'
        ];

        // Extract title
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }

        // Extract content
        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const paragraphs = Array.from(el.querySelectorAll('p')).map(p => p.textContent.trim()).filter(text => text.length > 20);
            if (paragraphs.length > 0) {
              content = paragraphs.join('\n\n');
              break;
            }
          }
        }
      }
      else if (hostname.includes('vneconomy')) {
        // VnEconomy selectors
        const titleSelectors = [
          'h1.detail-title',
          '.article-title h1',
          '.detail-content h1',
          'h1'
        ];
        
        const contentSelectors = [
          '.detail-content-body',
          '.article-content',
          '.detail-content .content-body',
          '.post-content'
        ];

        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }

        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const paragraphs = Array.from(el.querySelectorAll('p')).map(p => p.textContent.trim()).filter(text => text.length > 20);
            if (paragraphs.length > 0) {
              content = paragraphs.join('\n\n');
              break;
            }
          }
        }
      }
      else if (hostname.includes('thanhnien')) {
        // Thanh Niên selectors
        const titleSelectors = [
          '.detail-title h1',
          '.article-title',
          'h1.title',
          'h1'
        ];
        
        const contentSelectors = [
          '.detail-cmain',
          '.article-body',
          '.content-detail',
          '.post-content'
        ];

        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }

        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const paragraphs = Array.from(el.querySelectorAll('p')).map(p => p.textContent.trim()).filter(text => text.length > 20);
            if (paragraphs.length > 0) {
              content = paragraphs.join('\n\n');
              break;
            }
          }
        }
      }
      else if (hostname.includes('tuoitre')) {
        // Tuổi Trẻ selectors  
        const titleSelectors = [
          '.article-title h1',
          '.detail-title',
          'h1.title',
          'h1'
        ];
        
        const contentSelectors = [
          '.detail-content article',
          '.article-content',
          '.content-article',
          '.post-content'
        ];

        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }

        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const paragraphs = Array.from(el.querySelectorAll('p')).map(p => p.textContent.trim()).filter(text => text.length > 20);
            if (paragraphs.length > 0) {
              content = paragraphs.join('\n\n');
              break;
            }
          }
        }
      }
      else if (hostname.includes('dantri')) {
        // Dân trí selectors
        const titleSelectors = [
          'h1.title-page-detail',
          '.detail-title h1',
          'h1.dt-text-title',
          '.article-title h1',
          'h1'
        ];
        
        const contentSelectors = [
          '.singular-content',
          '.detail-content',
          '.article-content',
          '.dt-text-content',
          '.content-body'
        ];

        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }

        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const paragraphs = Array.from(el.querySelectorAll('p')).map(p => p.textContent.trim()).filter(text => text.length > 20);
            if (paragraphs.length > 0) {
              content = paragraphs.join('\n\n');
              break;
            }
          }
        }
      }
      
      // Generic fallback for other Vietnamese sites
      if (!content) {
        console.log('Using generic Vietnamese extraction...');
        const genericSelectors = [
          'article p',
          '.article p',
          '.content p',
          '.post p',
          '.detail p',
          'main p',
          '.container p'
        ];

        for (const selector of genericSelectors) {
          const paragraphs = Array.from(document.querySelectorAll(selector))
            .map(p => p.textContent.trim())
            .filter(text => {
              if (text.length < 30) return false;
              if (text.includes('©') || text.includes('Copyright')) return false;
              if (text.includes('Tags:') || text.includes('Từ khóa:')) return false;
              if (text.includes('Chia sẻ:') || text.includes('Share:')) return false;
              if (text.match(/^\d+\/\d+\/\d+/)) return false;
              return true;
            });

          if (paragraphs.length >= 3) {
            content = paragraphs.join('\n\n');
            break;
          }
        }
      }

      // Generic title fallback
      if (!title) {
        const titleEl = document.querySelector('h1') || document.querySelector('title');
        if (titleEl) {
          title = titleEl.textContent.trim();
        }
      }

      return { title, content };
    }, hostname);

    console.log(`Puppeteer extraction complete: title=${result.title.length} chars, content=${result.content.length} chars`);
    return result;

  } catch (error) {
    console.error('Puppeteer error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Basic extraction fallback (existing code)
async function basicExtraction(url, hostname) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  let title = '';
  let content = '';

  // Basic extraction logic (simplified version of previous code)
  if (hostname.includes('vnexpress')) {
    title = $('h1.title-detail').text().trim() || $('.title-detail h1').text().trim() || $('h1').first().text().trim();
    content = $('.fck_detail').text().trim() || $('.sidebar_1 .fck_detail').text().trim();
  } else if (hostname.includes('vietnamnet')) {
    title = $('.ArticleTitle').text().trim() || $('.detail-title h1').text().trim() || $('h1').first().text().trim();
    content = $('.ArticleContent').text().trim() || $('.detail-content-body').text().trim();
  } else if (hostname.includes('dantri')) {
    title = $('h1.title-page-detail').text().trim() || $('.detail-title h1').text().trim() || $('h1.dt-text-title').text().trim() || $('h1').first().text().trim();
    content = $('.singular-content').text().trim() || $('.detail-content').text().trim() || $('.dt-text-content').text().trim();
  } else if (hostname.includes('thanhnien')) {
    title = $('.detail-title h1').text().trim() || $('.article-title').text().trim() || $('h1').first().text().trim();
    content = $('.detail-cmain').text().trim() || $('.article-body').text().trim();
  } else if (hostname.includes('tuoitre')) {
    title = $('.article-title h1').text().trim() || $('.detail-title').text().trim() || $('h1').first().text().trim();
    content = $('.detail-content article').text().trim() || $('.article-content').text().trim();
  }

  return { title, content };
}

// Translation function (existing code)
async function translateText(text, direction) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  let systemPrompt;
  if (direction === 'vi-en') {
    systemPrompt = `You are a professional translator specializing in Vietnamese to English translation for journalism and financial news. Follow these guidelines:
    
CRITICAL REQUIREMENTS:
- Translate Vietnamese financial/business news to professional English
- Maintain journalistic tone and accuracy
- Use proper financial terminology
- Keep numbers, dates, and proper nouns accurate
- Follow Reuters/AP style guidelines
- Ensure clarity and readability for international audience

STYLE GUIDELINES:
- Professional, objective tone
- Active voice when possible
- Concise yet comprehensive
- Proper business/financial terminology
- Clear sentence structure
- Maintain original meaning and context

OUTPUT: Provide ONLY the English translation, no explanations or notes.`;
  } else {
    systemPrompt = `Bạn là một dịch giả chuyên nghiệp chuyên dịch tin tức tài chính từ tiếng Anh sang tiếng Việt theo phong cách báo VnEconomy.

YÊU CẦU QUAN TRỌNG:
- Dịch tin tức tài chính/kinh doanh từ tiếng Anh sang tiếng Việt chuyên nghiệp
- Sử dụng phong cách báo chí tài chính Việt Nam, đặc biệt là VnEconomy
- Thuật ngữ kinh tế chính xác và nhất quán
- Giữ nguyên số liệu, ngày tháng, tên riêng
- Văn phong trang trọng, khách quan
- Câu văn súc tích, dễ hiểu

PHONG CÁCH VNECONOMY:
- Tiêu đề: Ngắn gọn, có tác động, sử dụng động từ mạnh
- Nội dung: Khách quan, chính xác, sử dụng thuật ngữ kinh tế chuẩn
- Số liệu: Ghi rõ đơn vị (triệu USD, tỷ đồng, %)
- Trích dẫn: Rõ ràng nguồn tin, tên chức danh đầy đủ

KẾT QUẢ: Chỉ cung cấp bản dịch tiếng Việt, không giải thích thêm.`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
} 