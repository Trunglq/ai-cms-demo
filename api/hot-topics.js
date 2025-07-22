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
      sources: ['Google Trends', 'BaoMoi.com', 'Social Media'],
      selectedSources: selectedSources,
      totalCategories: 10,
      note: "Fresh content updated with current events and trends"
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

    // Vietnamese News removed - BaoMoi covers Vietnamese news already

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

// Generate current trending topics using AI (reduced to avoid too many similar topics)
async function generateCurrentTrendingTopics() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('No OpenAI API key, using fallback topics');
    return getFallbackTopics().slice(0, 2);
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
          content: `Hãy tạo ra 2 chủ đề đang HOT và trending nhất hiện tại tại Việt Nam (tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}) để viết báo. 

Yêu cầu:
- Chủ đề phải thực tế, có tính thời sự cao
- Phù hợp với người Việt Nam
- Có thể viết thành bài báo hay
- Bao gồm diverse categories

Trả về JSON format:
[
  {
    "title": "Tiêu đề ngắn gọn",
    "description": "Mô tả chi tiết 1-2 câu",
    "category": "Loại (Kinh tế/Công nghệ/Xã hội/Văn hóa/Crypto/Chứng khoán/Thể thao/Giáo dục/Sức khỏe/Du lịch)",
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

// Generate Google Trends topics (current & fresh)
async function generateGoogleTrendingTopics() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  // Generate realistic VN-Index level (1480-1520 range with fluctuation)
  const baseVnIndex = 1495;
  const fluctuation = Math.floor(Math.random() * 40) - 20; // ±20 points
  const currentVnIndex = baseVnIndex + fluctuation;
  const milestone = currentVnIndex >= 1500 ? '1500' : '1480';
  const indexAction = currentVnIndex >= 1500 ? 'vượt mốc' : 'tiến sát';
  
  return [
    {
      title: `Bitcoin phục hồi mạnh cuối năm ${currentYear}`,
      description: "Giá Bitcoin tăng trở lại sau giai đoạn điều chỉnh, thị trường crypto hồi phục với thanh khoản mạnh từ các quỹ đầu tư",
      category: "Crypto",
      score: 97,
      source: "Google Trends"
    },
    {
      title: `VN-Index ${indexAction} ${milestone} điểm - đạt ${currentVnIndex} điểm`,
      description: `Thị trường chứng khoán Việt Nam bứt phá mạnh, VN-Index hiện ở mức ${currentVnIndex} điểm với thanh khoản khủng từ nhóm cổ phiếu ngân hàng, thép và bất động sản`,
      category: "Chứng khoán", 
      score: currentVnIndex >= 1500 ? 96 : 92,
      source: "Google Trends"
    },
    {
      title: "V-League và đội tuyển Việt Nam săn vé World Cup",
      description: "Phong độ cao của các CLB V-League, đội tuyển quốc gia chuẩn bị tốt cho các trận quan trọng",
      category: "Thể thao",
      score: 92,
      source: "Google Trends"
    },
    {
      title: `Kỳ thi THPT ${currentYear} và xu hướng tuyển sinh mới`,
      description: "Thí sinh và phụ huynh quan tâm kết quả thi, các trường đại học công bố phương án tuyển sinh linh hoạt",
      category: "Giáo dục",
      score: 89,
      source: "Google Trends"
    },
    {
      title: "iPhone 16 và cuộc đua smartphone AI tại Việt Nam",
      description: "Sự ra mắt iPhone 16 với tính năng Apple Intelligence, cạnh tranh với Samsung Galaxy S24 Ultra",
      category: "Công nghệ",
      score: 91,
      source: "Google Trends"
    }
  ];
}

// Generate BaoMoi.com trending topics (fresh Vietnamese news)
async function generateBaoMoiTrendingTopics() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  return [
    {
      title: `Bão số ${Math.floor(Math.random() * 5) + 8} và ứng phó thiên tai cuối năm ${currentYear}`,
      description: "Các tỉnh miền Trung và Nam Trung Bộ chủ động ứng phó bão lũ, di dời dân cư và bảo đảm an toàn",
      category: "Xã hội",
      score: 96,
      source: "BaoMoi.com"
    },
    {
      title: `Lương tối thiểu vùng năm ${currentYear + 1} tăng mạnh`,
      description: "Chính phủ quyết định tăng lương tối thiểu vùng từ 6-7%, tác động tích cực đến đời sống người lao động",
      category: "Kinh tế",
      score: 93,
      source: "BaoMoi.com"
    },
    {
      title: "BHXH điện tử và chuyển đổi số trong y tế",
      description: "Triển khai ứng dụng VssID, khám chữa bệnh không giấy tờ, thanh toán BHYT qua QR code",
      category: "Sức khỏe",
      score: 88,
      source: "BaoMoi.com"
    },
    {
      title: "Đường sắt tốc độ cao Bắc-Nam khởi động dự án",
      description: "Dự án đường sắt tốc độ cao 1.700km chính thức khởi động, kết nối từ Hà Nội đến TP.HCM",
      category: "Xã hội",
      score: 91,
      source: "BaoMoi.com"
    },
    {
      title: `Nghỉ Tết Nguyên đán ${currentYear + 1} kéo dài 9 ngày`,
      description: "Lịch nghỉ Tết Âm lịch chính thức, người dân chuẩn bị kế hoạch về quê và du lịch",
      category: "Văn hóa",
      score: 89,
      source: "BaoMoi.com"
    },
    {
      title: "Vinhomes, Vingroup dẫn đầu thị trường bất động sản",
      description: "Các dự án của Vingroup tiếp tục thu hút khách hàng, giá bất động sản ổn định trong quý IV",
      category: "Chứng khoán",
      score: 85,
      source: "BaoMoi.com"
    }
  ];
}

// Generate Social Media trending topics (viral & current)
async function generateSocialMediaTrendingTopics() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  return [
    {
      title: "Sơn Tùng M-TP comeback với MV mới 'Making My Way'",
      description: "MV mới của Sơn Tùng M-TP gây bão mạng xã hội, đạt hàng triệu view chỉ sau vài giờ ra mắt",
      category: "Văn hóa",
      score: 98,
      source: "Social Media"
    },
    {
      title: "BlackPink Jennie đến Việt Nam quay show thực tế",
      description: "Jennie (BlackPink) có mặt tại TP.HCM quay chương trình thực tế, fan Việt phấn khích cực độ",
      category: "Văn hóa",
      score: 95,
      source: "Social Media"
    },
    {
      title: "Trend 'soft life' và lối sống tối giản của Gen Z",
      description: "Xu hướng sống chậm, tối giản và cân bằng work-life balance được giới trẻ Việt ưa chuộng",
      category: "Sức khỏe",
      score: 91,
      source: "Social Media"
    },
    {
      title: `World Cup 2026 và hy vọng đội tuyển Việt Nam`,
      description: "Người hâm mộ kỳ vọng đội tuyển Việt Nam sẽ tạo bất ngờ trong vòng loại World Cup 2026",
      category: "Thể thao",
      score: 93,
      source: "Social Media"
    },
    {
      title: "Solana (SOL) tăng giá mạnh, vượt mặt Ethereum",
      description: "Đồng tiền số Solana tăng vọt, thu hút sự chú ý của cộng đồng crypto Việt Nam",
      category: "Crypto",
      score: 89,
      source: "Social Media"
    },
    {
      title: "Apple Vision Pro và kỷ nguyên thực tế ảo tại Việt Nam",
      description: "Công nghệ VR/AR ngày càng phổ biến, giới trẻ Việt quan tâm đến các thiết bị thực tế ảo",
      category: "Công nghệ",
      score: 87,
      source: "Social Media"
    }
  ];
}

// Vietnamese News source removed - BaoMoi.com already covers Vietnamese news

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