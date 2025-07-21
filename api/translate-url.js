const cheerio = require('cheerio');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

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

    // Extract content using Mozilla Readability
    const hostname = new URL(url).hostname.toLowerCase();
    console.log(`Processing ${hostname} with Mozilla Readability...`);

    let title = '';
    let content = '';

    try {
      const readabilityData = await readabilityExtraction(url, hostname);
      title = readabilityData.title;
      content = readabilityData.content;
      console.log(`Readability result: title=${title?.length || 0} chars, content=${content?.length || 0} chars`);
    } catch (readabilityError) {
      console.log('Readability extraction failed, falling back to basic extraction:', readabilityError.message);
      const basicData = await basicExtraction(url, hostname);
      title = basicData.title;
      content = basicData.content;
    }

    if (!title && !content) {
      return res.status(400).json({ 
        error: `Không thể trích xuất nội dung từ ${hostname}. Vui lòng thử URL khác hoặc kiểm tra URL có hợp lệ không.`
      });
    }

    // Debug logging
    console.log(`Extracted for ${hostname}: title=${title?.length || 0} chars, content=${content?.length || 0} chars`);

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
      },
      debug: {
        hostname: hostname,
        extractionMethod: content ? (content.length > 500 ? 'readability' : 'fallback') : 'failed',
        titleLength: title?.length || 0,
        contentLength: content?.length || 0,
        readabilityUsed: content && content.length > 500
      }
    });

  } catch (error) {
    console.error('Error in translate-url:', error);
    res.status(500).json({ error: 'Lỗi server khi xử lý URL' });
  }
}

// Mozilla Readability extraction - Primary method
async function readabilityExtraction(url, hostname) {
  console.log(`Using Mozilla Readability for ${hostname}...`);
  
  try {
    // Fetch HTML with proper headers to mimic real browser
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'no-cache',
        'Referer': url
      },
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log(`Fetched HTML content: ${html.length} characters`);
    
    // Create JSDOM instance
    const dom = new JSDOM(html, {
      url: url,
      contentType: 'text/html',
      includeNodeLocations: false,
      storageQuota: 10000000
    });

    const document = dom.window.document;
    
    // Use Mozilla Readability to extract main content
    const reader = new Readability(document, {
      debug: false,
      maxElemsToParse: 0, // Parse all elements
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: ['caption', 'credit', 'highlight']
    });

    const article = reader.parse();
    
    if (!article) {
      throw new Error('Readability could not parse article content');
    }

    console.log(`Readability extracted: title="${article.title}", content=${article.textContent?.length || 0} chars`);
    
    // Clean up the content
    const cleanContent = cleanReadabilityContent(article.textContent || '');
    const cleanTitle = cleanReadabilityTitle(article.title || '');

    return {
      title: cleanTitle,
      content: cleanContent,
      readabilityScore: article.length || 0,
      byline: article.byline || '',
      excerpt: article.excerpt || ''
    };

  } catch (error) {
    console.error(`Readability extraction failed for ${hostname}:`, error.message);
    throw error;
  }
}

// Clean up readability extracted content
function cleanReadabilityContent(content) {
  if (!content) return '';
  
  return content
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/^\s+|\s+$/g, '') // Trim
    .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
    .replace(/[^\S\r\n]+/g, ' ') // Normalize whitespace but keep line breaks
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // Filter out common boilerplate patterns
      if (trimmed.length < 20) return false;
      if (trimmed.includes('©') || trimmed.includes('Copyright')) return false;
      if (trimmed.includes('Tags:') || trimmed.includes('Từ khóa:')) return false;
      if (trimmed.includes('Chia sẻ:') || trimmed.includes('Share:')) return false;
      if (trimmed.includes('Subscribe') || trimmed.includes('Newsletter')) return false;
      if (trimmed.match(/^\d+\/\d+\/\d+/) || trimmed.match(/\d+:\d+/)) return false;
      return true;
    })
    .join('\n\n')
    .trim();
}

// Clean up readability extracted title
function cleanReadabilityTitle(title) {
  if (!title) return '';
  
  return title
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s*-\s*.*$/, '') // Remove site name suffix (e.g., "Title - VnExpress")
    .replace(/\s*\|\s*.*$/, '') // Remove site name suffix (e.g., "Title | VietnamNet")
    .trim();
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
    
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 45000  // Increase timeout for slow sites
      });

      // Wait for content to load
      await page.waitForTimeout(5000); // Increase wait time
    } catch (error) {
      console.log(`Navigation timeout for ${url}, trying fallback...`);
      // Try a second time with different settings
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      await page.waitForTimeout(2000);
    }

    console.log('Extracting content with site-specific selectors...');
    
    const result = await page.evaluate((hostname) => {
      let title = '';
      let content = '';

      // Site-specific extraction logic
      if (hostname.includes('vnexpress')) {
        // VnExpress selectors - Updated for better extraction
        const titleSelectors = [
          'h1.title-detail',
          '.title-detail h1',
          'h1.title_news_detail',
          '.container h1',
          'h1'
        ];
        
        const contentSelectors = [
          '.fck_detail p',
          '.sidebar_1 .fck_detail p',
          '.Normal p',
          'article .fck_detail p',
          '.content_detail .Normal p',
          '.content_detail p',
          'article p'
        ];

        // Extract title
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }

        // Extract content - Updated for VnExpress
        for (const selector of contentSelectors) {
          const paragraphs = Array.from(document.querySelectorAll(selector))
            .map(p => p.textContent.trim())
            .filter(text => {
              if (text.length < 30) return false;
              if (text.includes('©') || text.includes('Copyright')) return false;
              if (text.includes('Tags:') || text.includes('Từ khóa:')) return false;
              if (text.includes('Chia sẻ:') || text.includes('Share:')) return false;
              if (text.includes('VnExpress')) return false;
              if (text.match(/^\d+\/\d+\/\d+/)) return false;
              return true;
            });
          
          if (paragraphs.length >= 2) {
            content = paragraphs.join('\n\n');
            break;
          }
        }
      } 
      else if (hostname.includes('vietnamnet')) {
        // VietnamNet selectors - Updated for better extraction
        const titleSelectors = [
          '.ArticleTitle',
          '.detail-title h1',
          '.maincontent h1',
          '.content-detail h1',
          'h1.title',
          'h1'
        ];
        
        const contentSelectors = [
          '.ArticleContent p',
          '.maincontent .ArticleContent p',
          '.detail-content-body p',
          '.content-article-detail p',
          '.article-content p',
          '.content-detail p',
          'article p'
        ];

        // Extract title
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }

        // Extract content - Updated for VietnamNet
        for (const selector of contentSelectors) {
          const paragraphs = Array.from(document.querySelectorAll(selector))
            .map(p => p.textContent.trim())
            .filter(text => {
              if (text.length < 30) return false;
              if (text.includes('©') || text.includes('Copyright')) return false;
              if (text.includes('Tags:') || text.includes('Từ khóa:')) return false;
              if (text.includes('Chia sẻ:') || text.includes('Share:')) return false;
              if (text.includes('VietnamNet')) return false;
              if (text.match(/^\d+\/\d+\/\d+/)) return false;
              return true;
            });
          
          if (paragraphs.length >= 2) {
            content = paragraphs.join('\n\n');
            break;
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
        // Dân trí selectors - Updated based on actual site structure
        const titleSelectors = [
          'h1',
          '.title-page-detail h1',
          '.detail-title',
          'h1.title',
          '.article-title'
        ];
        
        const contentSelectors = [
          '.singular-content p',
          '.detail-content p',
          '.article-body p',
          '.content-detail p',
          'article p',
          '.post-content p',
          '.entry-content p'
        ];

        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }

        // For Dantri: Since contentSelectors already target paragraphs, get them directly
        for (const selector of contentSelectors) {
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
          
          if (paragraphs.length >= 2) {
            content = paragraphs.join('\n\n');
            break;
          }
        }
      }
      
      // Enhanced generic fallback for all Vietnamese sites
      if (!content) {
        console.log(`Using enhanced generic extraction for ${hostname}...`);
        
        // Try all paragraphs on page with better filtering
        const allParagraphs = Array.from(document.querySelectorAll('p'))
          .map(p => p.textContent.trim())
          .filter(text => {
            if (text.length < 50) return false; // Increase minimum length
            if (text.includes('©') || text.includes('Copyright') || text.includes('Bản quyền')) return false;
            if (text.includes('Tags:') || text.includes('Từ khóa:') || text.includes('Tag:')) return false;
            if (text.includes('Chia sẻ') || text.includes('Share') || text.includes('Facebook')) return false;
            if (text.includes('Theo ') && text.includes(' -')) return false; // Remove author attribution
            if (text.match(/^\d+\/\d+\/\d+/) || text.match(/\d+:\d+/)) return false; // Remove dates/times
            if (text.includes('đọc thêm') || text.includes('xem thêm')) return false;
            if (text.includes('VnExpress') || text.includes('VietnamNet') || text.includes('Dantri')) return false;
            return true;
          });

        if (allParagraphs.length >= 3) {
          content = allParagraphs.slice(0, 15).join('\n\n'); // Take first 15 good paragraphs
          console.log(`Enhanced generic fallback found ${allParagraphs.length} paragraphs for ${hostname}`);
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

// Simple fallback extraction using Cheerio
async function basicExtraction(url, hostname) {
  console.log(`Using basic extraction fallback for ${hostname}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      timeout: 20000
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Generic title extraction
    let title = '';
    const titleSelectors = ['h1', 'title', '.title', '.article-title', '.detail-title'];
    for (const selector of titleSelectors) {
      const titleEl = $(selector).first();
      if (titleEl.length && titleEl.text().trim()) {
        title = titleEl.text().trim();
        break;
      }
    }

    // Generic content extraction - try to find main article content
    let content = '';
    const contentSelectors = [
      'article', '[role="main"]', '.content', '.article-content', 
      '.post-content', '.entry-content', '.detail-content', 'main'
    ];
    
    for (const selector of contentSelectors) {
      const contentEl = $(selector).first();
      if (contentEl.length) {
        // Extract paragraphs from the content area
        const paragraphs = contentEl.find('p').map((i, el) => $(el).text().trim()).get()
          .filter(text => {
            if (text.length < 30) return false;
            if (text.includes('©') || text.includes('Copyright') || text.includes('Bản quyền')) return false;
            if (text.includes('Tags:') || text.includes('Từ khóa:')) return false;
            if (text.includes('Share') || text.includes('Chia sẻ')) return false;
            return true;
          });
        
        if (paragraphs.length >= 2) {
          content = paragraphs.slice(0, 10).join('\n\n');
          break;
        }
      }
    }

    // Last resort: try all paragraphs on page
    if (!content) {
      console.log(`Using last resort paragraph extraction for ${hostname}`);
      const allParagraphs = $('p').map((i, el) => $(el).text().trim()).get()
        .filter(text => {
          if (text.length < 40) return false;
          if (text.includes('©') || text.includes('Copyright')) return false;
          if (text.includes('Cookie') || text.includes('Privacy')) return false;
          if (text.includes('Subscribe') || text.includes('Newsletter')) return false;
          return true;
        });

      if (allParagraphs.length >= 2) {
        content = allParagraphs.slice(0, 8).join('\n\n');
      }
    }

    // Clean up title
    title = title
      .replace(/\s*-\s*.*$/, '') // Remove site name suffix
      .replace(/\s*\|\s*.*$/, '') // Remove site name suffix
      .trim();

    console.log(`Basic extraction result: title=${title.length} chars, content=${content.length} chars`);
    
    return { title: title || '', content: content || '' };
    
  } catch (error) {
    console.error(`Basic extraction failed for ${hostname}:`, error.message);
    return { title: '', content: '' };
  }
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