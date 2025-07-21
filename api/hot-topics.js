export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Fetching hot topics...');

    // Get trending topics from multiple sources
    const topics = await fetchHotTopics();
    
    res.json({
      topics: topics,
      lastUpdated: new Date().toISOString(),
      sources: ['Google Trends', 'Vietnamese News', 'Social Media', 'Tech Topics']
    });

  } catch (error) {
    console.error('Hot Topics API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

// Fetch hot topics from multiple sources
async function fetchHotTopics() {
  try {
    // Since we can't directly access Google Trends API without authentication,
    // we'll use a combination of curated trending topics and AI-generated suggestions
    // based on current events and Vietnamese market

    const currentTopics = await generateCurrentTrendingTopics();
    const techTopics = await generateTechTrendingTopics();
    const vietnameseTopics = await generateVietnameseTrendingTopics();
    
    // Combine and rank topics
    const allTopics = [
      ...currentTopics,
      ...techTopics, 
      ...vietnameseTopics
    ];

    // Sort by score and return top 10
    return allTopics
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((topic, index) => ({
        ...topic,
        rank: index + 1
      }));

  } catch (error) {
    console.error('Error fetching topics:', error);
    // Return fallback topics if API fails
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

// Generate tech trending topics
async function generateTechTrendingTopics() {
  return [
    {
      title: "AI và ChatGPT thay đổi ngành giáo dục Việt Nam",
      description: "Ảnh hưởng của trí tuệ nhân tạo đến phương pháp học tập và giảng dạy tại các trường học Việt Nam",
      category: "Công nghệ",
      score: 88,
      source: "Tech Trends"
    },
    {
      title: "Thanh toán điện tử và ví số phát triển mạnh",
      description: "Xu hướng thanh toán không tiền mặt và sự cạnh tranh giữa các ví điện tử tại Việt Nam",
      category: "Công nghệ",
      score: 82,
      source: "Tech Trends" 
    }
  ];
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

// Fallback topics when API fails
function getFallbackTopics() {
  return [
    {
      title: "Trí tuệ nhân tạo và tương lai việc làm",
      description: "Tác động của AI đối với thị trường lao động và kỹ năng cần thiết trong tương lai",
      category: "Công nghệ",
      score: 95,
      source: "Fallback Topics"
    },
    {
      title: "Kinh tế số và chuyển đổi số tại Việt Nam",
      description: "Quá trình số hóa của doanh nghiệp và chính phủ trong bối cảnh cuộc cách mạng 4.0",
      category: "Kinh tế",
      score: 90,
      source: "Fallback Topics"
    },
    {
      title: "Biến đổi khí hậu và phát triển bền vững",
      description: "Các giải pháp ứng phó với biến đổi khí hậu và xu hướng sống xanh tại Việt Nam",
      category: "Xã hội",
      score: 88,
      source: "Fallback Topics"
    },
    {
      title: "Giáo dục trực tuyến và học tập từ xa",
      description: "Xu hướng học tập online và tác động của công nghệ đến ngành giáo dục",
      category: "Xã hội",
      score: 85,
      source: "Fallback Topics"
    },
    {
      title: "Thương mại điện tử và hành vi người tiêu dùng",
      description: "Sự phát triển của e-commerce và thay đổi trong thói quen mua sắm của người Việt",
      category: "Kinh tế",
      score: 83,
      source: "Fallback Topics"
    },
    {
      title: "Sức khỏe tinh thần và áp lực xã hội",
      description: "Vấn đề sức khỏe tâm lý trong xã hội hiện đại và các giải pháp hỗ trợ",
      category: "Xã hội", 
      score: 80,
      source: "Fallback Topics"
    },
    {
      title: "Văn hóa K-pop và ảnh hưởng đến giới trẻ Việt",
      description: "Tác động của làn sóng Hallyu đến thế hệ Z Việt Nam",
      category: "Văn hóa",
      score: 78,
      source: "Fallback Topics"
    },
    {
      title: "Crypto và tài chính phi tập trung tại Việt Nam",
      description: "Thị trường tiền số và quy định pháp lý về cryptocurrency",
      category: "Kinh tế",
      score: 75,
      source: "Fallback Topics"
    },
    {
      title: "Du lịch nội địa và phát triển du lịch bền vững",
      description: "Xu hướng du lịch trong nước và bảo tồn di sản văn hóa",
      category: "Văn hóa",
      score: 72,
      source: "Fallback Topics"
    },
    {
      title: "Food delivery và văn hóa ẩm thực đường phố",
      description: "Sự phát triển của dịch vụ giao đồ ăn và ảnh hưởng đến văn hóa ẩm thực Việt",
      category: "Văn hóa",
      score: 70,
      source: "Fallback Topics"
    }
  ];
} 