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
  const systemPrompt = `Bạn là phóng viên báo chí Việt Nam với kinh nghiệm thực tế, viết theo phong cách của các báo uy tín như VnExpress, Tuổi Trẻ, Thanh Niên.

NHIỆM VỤ: Viết ${articleSpecs.name} (${articleSpecs.wordCount}) về chủ đề được cung cấp.

PHONG CÁCH BÁO CHÍ VIỆT NAM:
- Ngôn ngữ tự nhiên, không cường điệu
- Thông tin chính xác, có căn cứ
- Văn phong giản dị, dễ hiểu
- Tránh từ ngữ khoa trương, "hoa mỹ"
- Không dùng emoji trong nội dung chính

TỪ NGỮ CẦN TRÁNH:
- Cường điệu: "siêu", "cực kỳ", "tuyệt vời", "hoàn hảo", "xuất sắc"
- AI-like: "ngoài ra", "hơn nữa", "điều này", "việc này"
- Clickbait: "bí mật", "sốc", "không thể tin được", "gây bão"
- Thổi phồng: "bùng nổ", "sốt xình xịch", "làn sóng", "cơn sốt"

CẤU TRÚC: ${articleSpecs.structure}
ĐẶC ĐIỂM: ${articleSpecs.characteristics}
PHONG CÁCH: ${toneSpecs}
ĐỐI TƯỢNG: ${audienceSpecs}

${outputType === 'outline' ? `
ĐỊNH DẠNG OUTLINE:
# Tiêu đề bài viết
## I. Mở đầu
- Thông tin chính
- Tại sao vấn đề này quan trọng

## II. Thân bài
### 2.1 Vấn đề chính thứ nhất
- Thông tin chi tiết
- Dẫn chứng cụ thể

### 2.2 Vấn đề chính thứ hai
- Thông tin chi tiết
- Dẫn chứng cụ thể

### 2.3 Vấn đề chính thứ ba (nếu cần)
- Thông tin chi tiết
- Dẫn chứng cụ thể

## III. Kết luận
- Tóm tắt các điểm chính
- Nhận định/đánh giá
- Thông tin hữu ích cho người đọc

## IV. Ghi chú
- Nguồn thông tin tham khảo
- Đề xuất hình ảnh minh họa
` : outputType === 'complete' ? `
ĐỊNH DẠNG BÀI BÁO:
Viết bài báo hoàn chỉnh với:
- Tiêu đề phù hợp, thu hút
- Mở đầu thông tin rõ ràng
- Thân bài có cấu trúc hợp lý
- Kết bài tóm tắt và nhận định
- Ngôn ngữ tự nhiên, dễ hiểu
` : `
ĐỊNH DẠNG OUTPUT - CẢ HAI:
{
  "outline": "Dàn bài như định dạng trên",
  "article": "Bài báo hoàn chỉnh như định dạng trên"
}
`}

QUY TẮC QUAN TRỌNG:
- Viết như phóng viên thật, không phải AI
- Dùng thông tin có thật, tránh bịa đặt
- Ngôn ngữ báo chí Việt Nam chuẩn mực
- Tránh các cụm từ như "trong bối cảnh...", "không thể phủ nhận rằng..."
- Không dùng "Furthermore", "Moreover" dịch trực tiếp
- Tham khảo cách viết của VnExpress, Tuổi Trẻ cho văn phong
- Độ dài: ${articleSpecs.wordCount}

GỢI Ý THAY THẾ:
- Thay vì "siêu tốt" → dùng "tốt", "khá tốt"
- Thay vì "bùng nổ" → dùng "phát triển mạnh", "tăng trưởng"
- Thay vì "gây sốt" → dùng "được quan tâm", "thu hút sự chú ý"
- Thay vì "hoàn hảo" → dùng "phù hợp", "đáp ứng tốt"`;

  const userPrompt = `Chủ đề cần viết: ${topic}

${context ? `Thông tin bổ sung: ${context}` : ''}

Viết ${outputType === 'outline' ? 'dàn bài' : outputType === 'complete' ? 'bài báo' : 'cả dàn bài và bài báo'} với văn phong tự nhiên của báo chí Việt Nam.

Lưu ý: Viết như một phóng viên có kinh nghiệm, tránh ngôn ngữ cường điệu hoặc có thể nhận ra là do AI viết.`;

  return { systemPrompt, userPrompt };
}

// Build prompts for hot topics writing
function buildHotTopicPrompts(hotTopic, context, articleSpecs, toneSpecs, audienceSpecs, outputType) {
  const systemPrompt = `Bạn là phóng viên báo chí có kinh nghiệm viết về các chủ đề thời sự và xu hướng xã hội tại Việt Nam.

NHIỆM VỤ: Viết ${articleSpecs.name} (${articleSpecs.wordCount}) về chủ đề đang được quan tâm.

PHONG CÁCH BÁO CHÍ THỜI SỰ:
- Tiếp cận chủ đề một cách tự nhiên, không phô trương
- Thông tin chính xác, có nguồn gốc rõ ràng  
- Văn phong bình dân, gần gũi với độc giả
- Tránh ngôn từ thổi phồng, cường điệu

CẤU TRÚC: ${articleSpecs.structure}
ĐẶC ĐIỂM: ${articleSpecs.characteristics}  
PHONG CÁCH: ${toneSpecs}
ĐỐI TƯỢNG: ${audienceSpecs}

CÁCH TIẾP CẬN CHỦ ĐỀ THỜI SỰ:
- Mở đầu bằng thông tin cụ thể, không quá "câu view"
- Trình bày các khía cạnh khác nhau của vấn đề
- Dẫn chứng từ thực tế, có thể kiểm chứng
- Tránh dùng từ như "bùng nổ", "sốt xình xịch", "gây sốt"

${outputType === 'outline' ? `
ĐỊNH DẠNG OUTLINE - BÀI THỜI SỰ:
# Tiêu đề bài viết
## I. Mở đầu
- Thông tin chính của sự việc
- Dữ liệu/sự kiện cụ thể
- Tại sao vấn đề này quan trọng

## II. Thân bài
### 2.1 Hiện trạng vấn đề
- Tình hình hiện tại
- Các con số, dữ liệu

### 2.2 Phân tích nguyên nhân
- Lý do dẫn đến vấn đề
- Các yếu tố ảnh hưởng

### 2.3 Tác động và hậu quả
- Ảnh hưởng đến người dân
- Triển vọng trong tương lai

## III. Kết luận
- Tóm tắt vấn đề chính
- Nhận định về xu hướng
- Thông tin hữu ích cho độc giả
` : outputType === 'complete' ? `
ĐỊNH DẠNG BÀI BÁO HOÀN CHỈNH:
Viết bài báo thời sự với:
- Tiêu đề phù hợp, thu hút
- Mở đầu thông tin rõ ràng
- Nội dung phân tích chi tiết
- Thông tin hữu ích cho độc giả
- Kết bài tóm tắt có ích
- Ngôn ngữ tự nhiên, dễ hiểu
` : `
ĐỊNH DẠNG OUTPUT - CẢ HAI:
{
  "outline": "Dàn bài như định dạng trên",
  "article": "Bài báo hoàn chỉnh như định dạng trên"
}
`}

QUY TẮC VIẾT BÁI THỜI SỰ:
- Thông tin chính xác, đáng tin cậy
- Tránh ngôn từ cường điệu, clickbait
- Viết như phóng viên thực tế, không như AI
- Tham khảo phong cách VnExpress, Tuổi Trẻ, Thanh Niên
- Độ dài phù hợp: ${articleSpecs.wordCount}
- Không dùng emoji trong nội dung chính`;

  const userPrompt = `Chủ đề thời sự: ${hotTopic}

${context ? `Thông tin tham khảo: ${context}` : ''}

Viết ${outputType === 'outline' ? 'dàn bài' : outputType === 'complete' ? 'bài báo' : 'cả dàn bài và bài báo'} theo phong cách báo chí Việt Nam chuyên nghiệp.

Yêu cầu cụ thể:
- Trình bày vấn đề một cách khách quan
- Sử dụng ngôn ngữ tự nhiên, không cường điệu  
- Đưa ra thông tin có giá trị thực tế
- Viết sao cho người đọc không nhận ra là AI tạo`;

  return { systemPrompt, userPrompt };
}

// Build prompts for articles-based writing
function buildArticlesPrompts(articles, articleSpecs, toneSpecs, audienceSpecs, outputType) {
  const systemPrompt = `Bạn là biên tập viên báo chí có kinh nghiệm tổng hợp và viết lại tin tức từ nhiều nguồn khác nhau.

NHIỆM VỤ: Từ các bài báo nguồn, viết ${articleSpecs.name} (${articleSpecs.wordCount}) mới.

NGUYÊN TẮC VIẾT LẠI:
- Hoàn toàn không copy nguyên văn từ bài gốc
- Tổng hợp thông tin, trình bày bằng cách riêng
- Giữ tính chính xác của thông tin
- Văn phong tự nhiên như báo Việt Nam
- Tránh ngôn từ cường điệu, "AI-like"

CẤU TRÚC: ${articleSpecs.structure}
ĐẶC ĐIỂM: ${articleSpecs.characteristics}
PHONG CÁCH: ${toneSpecs}
ĐỐI TƯỢNG: ${audienceSpecs}

Viết ${outputType === 'outline' ? 'dàn bài chi tiết' : outputType === 'complete' ? 'bài báo hoàn chỉnh' : 'cả dàn bài và bài báo'} theo phong cách báo chí chuyên nghiệp.`;

  const userPrompt = `CÁC BÀI NGUỒN THAM KHẢO:
${articles}

Từ các bài báo trên, hãy viết một bài mới hoàn toàn bằng ngôn ngữ của mình. Lưu ý:
1. Không sao chép nguyên văn bất kỳ đoạn nào
2. Tổng hợp thông tin, trình bày theo cách riêng
3. Văn phong tự nhiên, giống báo chí Việt Nam
4. Độ dài phù hợp: ${articleSpecs.wordCount}

Viết như một phóng viên có kinh nghiệm, tránh để người đọc nhận ra là AI tạo.`;

  return { systemPrompt, userPrompt };
}

// Build prompts for Word document writing
function buildWordPrompts(wordContent, articleSpecs, toneSpecs, audienceSpecs, outputType) {
  const systemPrompt = `Bạn là biên tập viên báo chí có kinh nghiệm chuyển đổi tài liệu thành bài báo.

NHIỆM VỤ: Từ nội dung file Word, viết thành ${articleSpecs.name} (${articleSpecs.wordCount}) theo chuẩn báo chí.

CÁCH TIẾP CẬN:
- Đọc hiểu nội dung, tái cấu trúc theo chuẩn báo chí
- Viết bằng ngôn ngữ tự nhiên, không cường điệu
- Tạo tiêu đề phù hợp, không clickbait
- Giữ nguyên thông tin chính xác từ tài liệu gốc
- Bổ sung ngữ cảnh nếu cần thiết

CẤU TRÚC: ${articleSpecs.structure}
ĐẶC ĐIỂM: ${articleSpecs.characteristics}  
PHONG CÁCH: ${toneSpecs}
ĐỐI TƯỢNG: ${audienceSpecs}

Tạo ${outputType === 'outline' ? 'dàn bài' : outputType === 'complete' ? 'bài báo' : 'cả dàn bài và bài báo'} với văn phong báo chí tự nhiên.`;

  const userPrompt = `NỘI DUNG TÀI LIỆU GỐC:
${wordContent}

Từ nội dung trên, hãy viết thành bài báo với yêu cầu:
1. Cấu trúc theo chuẩn báo chí Việt Nam
2. Ngôn ngữ tự nhiên, dễ hiểu  
3. Giữ nguyên thông tin chính xác
4. Độ dài phù hợp: ${articleSpecs.wordCount}

Viết như một phóng viên thực tế, tránh ngôn từ cường điệu hay có thể nhận ra là AI.`;

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