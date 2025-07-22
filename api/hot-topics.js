export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Fetching enhanced hot topics...');

    // Get selected sources from query parameters
    const sourcesParam = req.query.sources || 'google,baomoi,social,news';
    const selectedSources = sourcesParam.split(',');
    
    console.log('Selected sources:', selectedSources);

    // Get trending topics from multiple enhanced sources
    const topics = await fetchEnhancedHotTopics(selectedSources);
    
    // Generate category statistics
    const categoryStats = generateCategoryStats(topics);
    
    res.json({
      topics: topics,
      categoryStats: categoryStats,
      lastUpdated: new Date().toISOString(),
      sources: ['Google Trends', 'BaoMoi.com', 'Social Media', 'Vietnamese News'],
      selectedSources: selectedSources,
      totalCategories: 10
    });

  } catch (error) {
    console.error('Hot Topics API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

// Fetch hot topics from multiple enhanced sources
async function fetchEnhancedHotTopics(selectedSources) {
  try {
    let allTopics = [];

    // Google Trends simulation
    if (selectedSources.includes('google')) {
      const googleTopics = await generateGoogleTrendingTopics();
      allTopics.push(...googleTopics);
    }

    // BaoMoi.com simulation  
    if (selectedSources.includes('baomoi')) {
      const baomoiTopics = await generateBaoMoiTrendingTopics();
      allTopics.push(...baomoiTopics);
    }

    // Social Media simulation
    if (selectedSources.includes('social')) {
      const socialTopics = await generateSocialMediaTrendingTopics();
      allTopics.push(...socialTopics);
    }

    // Vietnamese News simulation
    if (selectedSources.includes('news')) {
      const newsTopics = await generateVietnameseNewsTrendingTopics();
      allTopics.push(...newsTopics);
    }

    // AI-generated current events (always include for freshness)
    const currentTopics = await generateCurrentTrendingTopics();
    allTopics.push(...currentTopics);

    // Remove duplicates and sort by score
    const uniqueTopics = removeDuplicateTopics(allTopics);

    // Sort by score and return top 15 (increased from 10)
    return uniqueTopics
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map((topic, index) => ({
        ...topic,
        rank: index + 1
      }));

  } catch (error) {
    console.error('Error fetching enhanced topics:', error);
    return getFallbackTopics();
  }
}

// Generate current trending topics using AI
async function generateCurrentTrendingTopics() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('No OpenAI API key, using fallback topics');
    return getFallbackTopics().slice(0, 4);
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
        messages: [{
          role: 'user',
          content: `Hãy tạo ra 4 chủ đề đang HOT và trending nhất hiện tại tại Việt Nam (tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}) để viết báo. 

Yêu cầu:
- Chủ đề phải thực tế, có tính thời sự cao
- Phù hợp với người Việt Nam
- Có thể viết thành bài báo hay
- Bao gồm: kinh tế, công nghệ, xã hội, văn hóa

Trả về JSON format:
[
  {
    "title": "Tiêu đề ngắn gọn",
    "description": "Mô tả chi tiết 1-2 câu",
    "category": "Loại (Kinh tế/Công nghệ/Xã hội/Văn hóa)",
    "score": 95,
    "source": "Current Events"
  }
]`
        }],
        temperature: 0.8,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Parse JSON response
    try {
      const topics = JSON.parse(content);
      return Array.isArray(topics) ? topics : [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return [];
    }

  } catch (error) {
    console.error('Error generating current topics:', error);
    return [];
  }
}

// Generate Google Trends topics (simulated)
async function generateGoogleTrendingTopics() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  
  return [
    {
      title: "Bitcoin và thị trường Crypto biến động mạnh",
      description: "Giá Bitcoin và các đồng tiền số khác dao động mạnh, tác động đến thị trường tài chính toàn cầu và Việt Nam",
      category: "Crypto",
      score: 96,
      source: "Google Trends"
    },
    {
      title: "VN-Index và thị trường chứng khoán Việt Nam",
      description: "Diễn biến thị trường chứng khoán, các cổ phiếu hot và xu hướng đầu tư của nhà đầu tư cá nhân",
      category: "Chứng khoán",
      score: 89,
      source: "Google Trends"
    },
    {
      title: "Euro 2024 và World Cup 2026 - Bóng đá châu Âu",
      description: "Các trận đấu nổi bật, đội tuyển Việt Nam và sự phát triển bóng đá trong nước",
      category: "Thể thao",
      score: 94,
      source: "Google Trends"
    }
  ];
}

// Generate BaoMoi.com trending topics (simulated)
async function generateBaoMoiTrendingTopics() {
  return [
    {
      title: "Cải cách giáo dục và chương trình mới 2024",
      description: "Những thay đổi trong chương trình giáo dục phổ thông và đại học, tác động đến học sinh và phụ huynh",
      category: "Giáo dục",
      score: 87,
      source: "BaoMoi.com"
    },
    {
      title: "Y tế công và bảo hiểm xã hội",
      description: "Cải cách hệ thống y tế, chi phí khám chữa bệnh và quyền lợi của người dân",
      category: "Sức khỏe",
      score: 85,
      source: "BaoMoi.com"
    },
    {
      title: "Du lịch nội địa và phục hồi sau Covid",
      description: "Sự phục hồi của ngành du lịch Việt Nam và xu hướng du lịch nội địa của người dân",
      category: "Du lịch",
      score: 78,
      source: "BaoMoi.com"
    }
  ];
}

// Generate Social Media trending topics (simulated)
async function generateSocialMediaTrendingTopics() {
  return [
    {
      title: "TikTok và văn hóa Gen Z Việt Nam",
      description: "Ảnh hưởng của TikTok đến giới trẻ, xu hướng viral và những thách thức của phụ huynh",
      category: "Văn hóa",
      score: 92,
      source: "Social Media"
    },
    {
      title: "Livestream bán hàng và thương mại điện tử",
      description: "Xu hướng bán hàng qua livestream, influencer marketing và thay đổi thói quen mua sắm",
      category: "Kinh tế",
      score: 90,
      source: "Social Media"
    },
    {
      title: "Mental health và áp lực xã hội của giới trẻ",
      description: "Vấn đề sức khỏe tinh thần, stress học tập và công việc trong thời đại số",
      category: "Sức khỏe",
      score: 86,
      source: "Social Media"
    }
  ];
}

// Generate Vietnamese News trending topics (simulated)
async function generateVietnameseNewsTrendingTopics() {
  return [
    {
      title: "Chính sách kinh tế và hỗ trợ doanh nghiệp SME",
      description: "Các gói hỗ trợ từ chính phủ cho doanh nghiệp nhỏ và vừa, khởi nghiệp trong bối cảnh phục hồi kinh tế",
      category: "Kinh tế",
      score: 88,
      source: "Vietnamese News"
    },
    {
      title: "Giao thông đô thị và quy hoạch thành phố thông minh",
      description: "Các dự án giao thông, quy hoạch đô thị và giải pháp cho tắc nghẽn tại các thành phố lớn",
      category: "Xã hội",
      score: 83,
      source: "Vietnamese News"
    },
    {
      title: "Năng lượng tái tạo và phát triển bền vững",
      description: "Các dự án năng lượng mặt trời, gió và cam kết Net Zero của Việt Nam đến 2050",
      category: "Xã hội",
      score: 81,
      source: "Vietnamese News"
    }
  ];
}

// Generate category statistics
function generateCategoryStats(topics) {
  const stats = {
    total: topics.length,
    categories: {},
    sources: {},
    scoreRanges: {
      'super_hot': 0,  // 90%+
      'hot': 0,        // 80-89%
      'trending': 0    // 70-79%
    }
  };

  topics.forEach(topic => {
    // Count by category
    const category = topic.category;
    stats.categories[category] = (stats.categories[category] || 0) + 1;
    
    // Count by source
    const source = topic.source;
    stats.sources[source] = (stats.sources[source] || 0) + 1;
    
    // Count by score range
    if (topic.score >= 90) {
      stats.scoreRanges.super_hot++;
    } else if (topic.score >= 80) {
      stats.scoreRanges.hot++;
    } else {
      stats.scoreRanges.trending++;
    }
  });

  return stats;
}

// Generate Vietnamese-specific trending topics
async function generateVietnameseTrendingTopics() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const seasonalTopics = {
    1: [{ // January
      title: "Xu hướng du lịch Tết Nguyên đán 2024",
      description: "Các điểm đến hot và xu hướng du lịch trong dịp Tết cổ truyền",
      category: "Văn hóa",
      score: 90,
      source: "Vietnamese Culture"
    }],
    3: [{ // March  
      title: "Mùa tuyển sinh đại học và áp lực học đường",
      description: "Thực trạng giáo dục và áp lực thi cử trong hệ thống giáo dục Việt Nam",
      category: "Xã hội", 
      score: 85,
      source: "Vietnamese Society"
    }],
    6: [{ // June
      title: "Mùa thi tốt nghiệp THPT và tương lai của thế hệ trẻ",
      description: "Kỳ thi quan trọng và định hướng nghề nghiệp của học sinh Việt Nam",
      category: "Xã hội",
      score: 92,
      source: "Vietnamese Society"
    }],
    9: [{ // September
      title: "Năm học mới và đổi mới giáo dục",
      description: "Những thay đổi trong chương trình giáo dục và phương pháp học tập",
      category: "Xã hội",
      score: 80,
      source: "Vietnamese Society"  
    }],
    12: [{ // December
      title: "Thị trường cuối năm và xu hướng tiêu dùng",
      description: "Hoạt động mua sắm cuối năm và xu hướng tiêu dùng của người Việt",
      category: "Kinh tế",
      score: 78,
      source: "Vietnamese Economy"
    }]
  };

  // Always include these evergreen Vietnamese topics
  const evergreenTopics = [
    {
      title: "Bất động sản và giá nhà đất tại các thành phố lớn", 
      description: "Thị trường bất động sản và khả năng mua nhà của người trẻ Việt Nam",
      category: "Kinh tế",
      score: 87,
      source: "Vietnamese Economy"
    },
    {
      title: "Startup Việt và câu chuyện khởi nghiệp",
      description: "Hệ sinh thái khởi nghiệp và những startup unicorn Việt Nam",
      category: "Kinh tế", 
      score: 75,
      source: "Vietnamese Business"
    }
  ];

  const seasonal = seasonalTopics[currentMonth] || [];
  return [...seasonal, ...evergreenTopics];
}

// Remove duplicate topics based on title similarity
function removeDuplicateTopics(topics) {
  const unique = [];
  const seenTitles = new Set();
  
  for (const topic of topics) {
    // Simple duplicate check based on first few words
    const titleKey = topic.title.split(' ').slice(0, 3).join(' ').toLowerCase();
    
    if (!seenTitles.has(titleKey)) {
      seenTitles.add(titleKey);
      unique.push(topic);
    }
  }
  
  return unique;
}

// Enhanced fallback topics with all categories
function getFallbackTopics() {
  return [
    {
      title: "Bitcoin tăng giá mạnh, nhà đầu tư Việt gấp rút mua vào",
      description: "Giá Bitcoin vượt mốc $70,000, nhiều nhà đầu tư Việt Nam quan tâm đến thị trường crypto",
      category: "Crypto",
      score: 95,
      source: "Fallback Topics"
    },
    {
      title: "VN-Index biến động, cổ phiếu ngân hàng dẫn dắt thị trường",
      description: "Thị trường chứng khoán Việt Nam có những phiên giao dịch sôi động với thanh khoản cao",
      category: "Chứng khoán",
      score: 92,
      source: "Fallback Topics"
    },
    {
      title: "Đội tuyển bóng đá Việt Nam chuẩn bị cho vòng loại World Cup",
      description: "HLV Troussier công bố danh sách, người hâm mộ kỳ vọng thành tích tốt",
      category: "Thể thao",
      score: 90,
      source: "Fallback Topics"
    },
    {
      title: "Cải cách giáo dục: Chương trình mới có gì khác biệt?",
      description: "Bộ Giáo dục công bố những thay đổi lớn trong chương trình giáo dục phổ thông",
      category: "Giáo dục",
      score: 88,
      source: "Fallback Topics"
    },
    {
      title: "Trí tuệ nhân tạo thay đổi thị trường lao động Việt Nam",
      description: "AI tác động mạnh đến việc làm, nhiều nghề nghiệp cần kỹ năng mới",
      category: "Công nghệ",
      score: 87,
      source: "Fallback Topics"
    },
    {
      title: "Y tế công: Bệnh viện quá tải, cần giải pháp cấp bách",
      description: "Hệ thống y tế công đối mặt nhiều thách thức, đặc biệt tại các thành phố lớn",
      category: "Sức khỏe",
      score: 85,
      source: "Fallback Topics"
    },
    {
      title: "Kinh tế số và cơ hội cho doanh nghiệp SME",
      description: "Chuyển đổi số mở ra nhiều cơ hội mới cho doanh nghiệp nhỏ và vừa",
      category: "Kinh tế",
      score: 83,
      source: "Fallback Topics"
    },
    {
      title: "Du lịch Việt Nam: Hồi phục sau đại dịch",
      description: "Ngành du lịch đang từng bước phục hồi với nhiều chính sách hỗ trợ",
      category: "Du lịch",
      score: 80,
      source: "Fallback Topics"
    },
    {
      title: "Giao thông đô thị: Tắc nghẽn và giải pháp bền vững",
      description: "Các thành phố lớn đang tìm giải pháp cho vấn đề kẹt xe ngày càng nghiêm trọng",
      category: "Xã hội",
      score: 78,
      source: "Fallback Topics"
    },
    {
      title: "TikTok và xu hướng văn hóa mới của giới trẻ",
      description: "Mạng xã hội TikTok tạo ra những xu hướng văn hóa mới, ảnh hưởng mạnh đến GenZ",
      category: "Văn hóa",
      score: 75,
      source: "Fallback Topics"
    }
  ];
} 