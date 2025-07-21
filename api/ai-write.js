export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      inputMethod, 
      inputContent, 
      inputContext, 
      articleType, 
      outputType, 
      writingTone, 
      targetAudience 
    } = req.body;

    if (!inputContent) {
      return res.status(400).json({ error: 'Input content is required' });
    }

    console.log(`AI Writing: ${inputMethod} → ${articleType} (${outputType})`);

    // Get article specifications
    const articleSpecs = getArticleSpecs(articleType);
    const toneSpecs = getToneSpecs(writingTone);
    const audienceSpecs = getAudienceSpecs(targetAudience);

    // Build prompts based on input method
    let systemPrompt, userPrompt;

    if (inputMethod === 'topic') {
      ({ systemPrompt, userPrompt } = buildTopicPrompts(
        inputContent, inputContext, articleSpecs, toneSpecs, audienceSpecs, outputType
      ));
    } else if (inputMethod === 'hottopics') {
      ({ systemPrompt, userPrompt } = buildHotTopicPrompts(
        inputContent, inputContext, articleSpecs, toneSpecs, audienceSpecs, outputType
      ));
    } else if (inputMethod === 'articles') {
      ({ systemPrompt, userPrompt } = buildArticlesPrompts(
        inputContent, articleSpecs, toneSpecs, audienceSpecs, outputType
      ));
    } else if (inputMethod === 'word') {
      ({ systemPrompt, userPrompt } = buildWordPrompts(
        inputContent, articleSpecs, toneSpecs, audienceSpecs, outputType
      ));
    } else {
      return res.status(400).json({ error: 'Invalid input method' });
    }

    // Call OpenAI API
    const result = await callOpenAI(systemPrompt, userPrompt, outputType);
    
    res.json(result);

  } catch (error) {
    console.error('AI Writing Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

// Article type specifications
function getArticleSpecs(articleType) {
  const specs = {
    'tin-van': {
      name: 'Tin vắn',
      wordCount: '200-400 từ',
      structure: 'Lead paragraph + 2-3 body paragraphs + Conclusion',
      characteristics: 'Súc tích, thông tin cốt lõi, trả lời 5W1H'
    },
    'tin-tong-hop': {
      name: 'Tin tổng hợp',
      wordCount: '400-800 từ',
      structure: 'Headline + Lead + Multiple sources/angles + Background + Conclusion',
      characteristics: 'Tổng hợp nhiều nguồn tin, phân tích đa chiều'
    },
    'phong-su-ngan': {
      name: 'Phóng sự ngắn',
      wordCount: '600-1000 từ',
      structure: 'Hook + Context + Main story + Supporting details + Resolution',
      characteristics: 'Kể chuyện, có tính nhân văn, chi tiết sinh động'
    },
    'bai-phan-tich': {
      name: 'Bài phân tích',
      wordCount: '800-1200 từ',
      structure: 'Issue setup + Analysis + Evidence + Multiple perspectives + Conclusion',
      characteristics: 'Phân tích sâu, dẫn chứng, logic rõ ràng'
    },
    'phong-su-dai': {
      name: 'Phóng sự dài',
      wordCount: '1000-2000 từ',
      structure: 'Opening scene + Character development + Plot progression + Climax + Resolution',
      characteristics: 'Kể chuyện chi tiết, nhân vật sống động, cảm xúc'
    },
    'bai-binh-luan': {
      name: 'Bài bình luận',
      wordCount: '600-1000 từ',
      structure: 'Position statement + Arguments + Counter-arguments + Conclusion',
      characteristics: 'Quan điểm rõ ràng, lập luận chặt chẽ, phản biện'
    },
    'bao-cao-chuyen-sau': {
      name: 'Báo cáo chuyên sâu',
      wordCount: '1200+ từ',
      structure: 'Executive summary + Detailed analysis + Data/Statistics + Recommendations',
      characteristics: 'Dữ liệu chi tiết, phân tích chuyên sâu, khuyến nghị'
    }
  };

  return specs[articleType] || specs['tin-van'];
}

// Writing tone specifications
function getToneSpecs(tone) {
  const tones = {
    'objective': 'Khách quan, trung tính, không thiên vị, dựa trên sự thật',
    'engaging': 'Hấp dẫn, thu hút, sử dụng hook, storytelling elements',
    'formal': 'Trang trọng, chính thức, ngôn ngữ học thuật, chuyên nghiệp',
    'casual': 'Gần gũi, dễ hiểu, ngôn ngữ đơn giản, thân thiện'
  };

  return tones[tone] || tones['objective'];
}

// Target audience specifications
function getAudienceSpecs(audience) {
  const audiences = {
    'general': 'Độc giả đại chúng, ngôn ngữ phổ thông, dễ hiểu',
    'business': 'Cộng đồng doanh nghiệp, thuật ngữ kinh doanh, phân tích thị trường',
    'tech': 'Cộng đồng công nghệ, thuật ngữ kỹ thuật, xu hướng technology',
    'youth': 'Giới trẻ, sinh viên, ngôn ngữ trẻ trung, xu hướng mới',
    'professional': 'Chuyên gia, chuyên ngành, thuật ngữ chuyên môn, phân tích sâu'
  };

  return audiences[audience] || audiences['general'];
}

// Build prompts for topic-based writing
function buildTopicPrompts(topic, context, articleSpecs, toneSpecs, audienceSpecs, outputType) {
  const systemPrompt = `Bạn là một nhà báo chuyên nghiệp với 10+ năm kinh nghiệm viết báo tại Việt Nam.

NHIỆM VỤ: Viết ${articleSpecs.name} (${articleSpecs.wordCount}) về chủ đề được cung cấp.

CẤU TRÚC BÀI: ${articleSpecs.structure}
ĐẶC ĐIỂM: ${articleSpecs.characteristics}
PHONG CÁCH: ${toneSpecs}
ĐỐI TƯỢNG: ${audienceSpecs}

${outputType === 'outline' ? `
ĐỊNH DẠNG OUTPUT - SƯỜN BÀI:
# Tiêu đề bài viết
## I. Mở bài (Lead)
- Điểm nổi bật
- Hook để thu hút người đọc

## II. Thân bài
### 2.1 Điểm chính 1
- Chi tiết hỗ trợ
- Dẫn chứng/ví dụ

### 2.2 Điểm chính 2  
- Chi tiết hỗ trợ
- Dẫn chứng/ví dụ

### 2.3 Điểm chính 3 (nếu cần)
- Chi tiết hỗ trợ
- Dẫn chứng/ví dụ

## III. Kết bài
- Tóm tắt điểm chính
- Kết luận/triển望 
- Call-to-action (nếu cần)

## IV. Gợi ý bổ sung
- Nguồn tin cần kiểm chứng
- Ảnh/infographic đề xuất
- Keywords SEO
` : outputType === 'complete' ? `
ĐỊNH DẠNG OUTPUT - BÀI HOÀN CHỈNH:
Viết bài báo hoàn chỉnh với:
- Tiêu đề hấp dẫn
- Lead paragraph mạnh mẽ
- Thân bài có cấu trúc logic
- Kết bài tóm tắt và kết luận
- Ngôn ngữ báo chí chuyên nghiệp
` : `
ĐỊNH DẠNG OUTPUT - CẢ HAI:
{
  "outline": "Sườn bài như định dạng trên",
  "article": "Bài báo hoàn chỉnh như định dạng trên"
}
`}

QUAN TRỌNG:
- Tuân thủ đạo đức báo chí Việt Nam
- Thông tin chính xác, có thể kiểm chứng
- Ngôn ngữ tiếng Việt chuẩn mực
- Cấu trúc rõ ràng, logic
- Phù hợp với ${articleSpecs.wordCount}`;

  const userPrompt = `Chủ đề: ${topic}

${context ? `Bối cảnh/Góc độ: ${context}` : ''}

Hãy viết ${outputType === 'outline' ? 'sườn bài báo' : outputType === 'complete' ? 'bài báo hoàn chỉnh' : 'cả sườn và bài hoàn chỉnh'} theo yêu cầu trên.`;

  return { systemPrompt, userPrompt };
}

// Build prompts for hot topics writing
function buildHotTopicPrompts(hotTopic, context, articleSpecs, toneSpecs, audienceSpecs, outputType) {
  const systemPrompt = `Bạn là một nhà báo chuyên nghiệp với 10+ năm kinh nghiệm viết báo tại Việt Nam, đặc biệt giỏi về các chủ đề HOT và TRENDING.

NHIỆM VỤ: Viết ${articleSpecs.name} (${articleSpecs.wordCount}) về chủ đề HOT đang trending.

ƯU ĐIỂM CỦA BẠN:
- Nắm bắt xu hướng xã hội nhạy bén
- Hiểu tâm lý người đọc Việt Nam
- Viết hấp dẫn, viral-worthy content
- Kết hợp thông tin và góc độ mới lạ

CẤU TRÚC BÀI: ${articleSpecs.structure}
ĐẶC ĐIỂM: ${articleSpecs.characteristics}
PHONG CÁCH: ${toneSpecs}
ĐỐI TƯỢNG: ${audienceSpecs}

CHIẾN LƯỢC VIẾT CHỦ ĐỀ HOT:
- Hook mạnh mẽ ngay từ đầu bài
- Kết nối với trending context hiện tại
- Đưa ra góc nhìn độc đáo, fresh perspective
- Sử dụng data/số liệu nếu có thể
- Tạo điểm nhấn thu hút social sharing

${outputType === 'outline' ? `
ĐỊNH DẠNG OUTPUT - SƯỜN BÀI HOT:
# Tiêu đề câu view (trending-friendly)
## I. Hook Opening
- Điểm nóng hiện tại
- Con số/sự kiện gây chú ý
- Kết nối với trending topic

## II. Phân tích chủ đề HOT
### 2.1 Tại sao trending?
- Nguyên nhân hot
- Tác động xã hội

### 2.2 Góc nhìn độc đáo
- Phân tích sâu
- So sánh/đối chiếu

### 2.3 Ý nghĩa rộng hơn
- Xu hướng dài hạn
- Tác động tương lai

## III. Kết luận viral
- Takeaway message mạnh
- Call-to-action/discussion trigger

## IV. Elements cho viral
- Hashtags đề xuất
- Visual content ideas
- Social sharing angles
` : outputType === 'complete' ? `
ĐỊNH DẠNG OUTPUT - BÀI HOT HOÀN CHỈNH:
Viết bài báo trending với:
- Tiêu đề câu view, SEO-friendly
- Opening hook cực mạnh
- Nội dung phân tích sâu sắc
- Góc độ độc đáo, fresh insight
- Kết bài memorable, shareable
- Ngôn ngữ phù hợp với trend
` : `
ĐỊNH DẠNG OUTPUT - CẢ HAI:
{
  "outline": "Sườn bài HOT như định dạng trên",
  "article": "Bài HOT hoàn chỉnh như định dạng trên"
}
`}

QUAN TRỌNG:
- Tuân thủ đạo đức báo chí Việt Nam
- Thông tin chính xác, có thể kiểm chứng
- Tránh clickbait thái quá
- Tạo giá trị thật cho người đọc
- Phù hợp với ${articleSpecs.wordCount}
- Tối ưu cho social media sharing`;

  const userPrompt = `CHỦ ĐỀ HOT: ${hotTopic}

${context ? `BỐI CẢNH TRENDING: ${context}` : ''}

Hãy viết ${outputType === 'outline' ? 'sườn bài báo HOT' : outputType === 'complete' ? 'bài báo HOT hoàn chỉnh' : 'cả sườn và bài HOT hoàn chỉnh'} theo yêu cầu trên.

Đặc biệt chú ý:
- Khai thác tối đa tính HOT/trending của chủ đề
- Tạo content có khả năng viral cao
- Kết nối với bối cảnh xã hội Việt Nam hiện tại
- Đưa ra góc nhìn mới, không trùng lặp với các bài đã có`;

  return { systemPrompt, userPrompt };
}

// Build prompts for articles-based writing
function buildArticlesPrompts(articles, articleSpecs, toneSpecs, audienceSpecs, outputType) {
  const systemPrompt = `Bạn là một editor chuyên nghiệp, chuyên viết lại và tổng hợp nhiều bài báo thành bài mới.

NHIỆM VỤ: Từ các bài báo nguồn, tạo ra ${articleSpecs.name} (${articleSpecs.wordCount}) mới.

YÊU CẦU QUAN TRỌNG:
- KHÔNG copy nguyên văn từ bài gốc
- Tổng hợp, phân tích và viết lại bằng ngôn ngữ mới
- Tạo góc nhìn mới, giá trị gia tăng
- Trích dẫn nguồn khi cần thiết
- Tránh plagiarism hoàn toàn

CẤU TRÚC: ${articleSpecs.structure}
ĐẶC ĐIỂM: ${articleSpecs.characteristics}
PHONG CÁCH: ${toneSpecs}
ĐỐI TƯỢNG: ${audienceSpecs}

${outputType === 'outline' ? 'Tạo sườn bài chi tiết' : outputType === 'complete' ? 'Viết bài hoàn chỉnh' : 'Tạo cả sườn và bài hoàn chỉnh'}`;

  const userPrompt = `CÁC BÀI NGUỒN:
${articles}

Hãy phân tích, tổng hợp và tạo ra bài báo mới từ các nguồn trên. Đảm bảo:
1. Không copy nguyên văn
2. Tạo giá trị mới, góc nhìn mới  
3. Cấu trúc logic, mạch lạc
4. Phù hợp ${articleSpecs.wordCount}`;

  return { systemPrompt, userPrompt };
}

// Build prompts for Word document writing
function buildWordPrompts(wordContent, articleSpecs, toneSpecs, audienceSpecs, outputType) {
  const systemPrompt = `Bạn là một editor chuyên nghiệp, chuyên biến các tài liệu thành bài báo.

NHIỆM VỤ: Từ nội dung file Word, viết thành ${articleSpecs.name} (${articleSpecs.wordCount}) chuyên nghiệp.

YÊU CẦU:
- Phân tích và tái cấu trúc nội dung
- Viết theo chuẩn báo chí Việt Nam
- Tạo tiêu đề hấp dẫn
- Bổ sung context và background nếu cần
- Đảm bảo tính chính xác thông tin

CẤU TRÚC: ${articleSpecs.structure}  
ĐẶC ĐIỂM: ${articleSpecs.characteristics}
PHONG CÁCH: ${toneSpecs}
ĐỐI TƯỢNG: ${audienceSpecs}

${outputType === 'outline' ? 'Tạo sườn bài chi tiết' : outputType === 'complete' ? 'Viết bài hoàn chỉnh' : 'Tạo cả sườn và bài hoàn chỉnh'}`;

  const userPrompt = `NỘI DUNG FILE WORD:
${wordContent}

Hãy biến đổi thành bài báo chuyên nghiệp với:
1. Cấu trúc báo chí chuẩn
2. Ngôn ngữ phù hợp đối tượng
3. Thông tin chính xác, đầy đủ
4. Độ dài ${articleSpecs.wordCount}`;

  return { systemPrompt, userPrompt };
}

// Call OpenAI API
async function callOpenAI(systemPrompt, userPrompt, outputType) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

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
      temperature: 0.7,
      max_tokens: outputType === 'both' ? 4000 : 2500,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  // Parse result based on output type
  if (outputType === 'both') {
    try {
      const parsed = JSON.parse(content);
      return {
        outline: parsed.outline,
        article: parsed.article
      };
    } catch (e) {
      // Fallback: treat as single content
      return { content };
    }
  }

  return { content };
} 