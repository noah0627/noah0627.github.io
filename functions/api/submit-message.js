// functions/api/submit-message.js
export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS 设置
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { author, content } = await request.json();
    
    // 输入验证
    if (!author || !content) {
      return new Response(JSON.stringify({ error: '作者和内容不能为空' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (content.length > 500) {
      return new Response(JSON.stringify({ error: '留言内容不能超过500字' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return new Response(JSON.stringify({ error: '服务器配置错误' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const REPO = 'noah0627/noah0627.github.io';
    const PATH = 'files/website/note.txt';

    // 1. 获取当前文件内容
    const fileResponse = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${PATH}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Cloudflare-Pages-Function'
        }
      }
    );

    let fileData;
    let currentContent = '';
    
    if (fileResponse.status === 404) {
      // 文件不存在，创建新文件
      fileData = { sha: null };
    } else if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      throw new Error(`GitHub API错误: ${fileResponse.status} - ${errorText}`);
    } else {
      fileData = await fileResponse.json();
      if (fileData.content) {
        currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');
      }
    }
    
    // 2. 添加新留言
    const timestamp = new Date().toLocaleString('zh-CN');
    const newMessage = `作者:${author}\n时间:${timestamp}\n内容:${content}\n\n`;
    const newContent = currentContent + newMessage;
    
    // 3. 更新到 GitHub
    const updateResponse = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `添加新留言 - ${author}`,
          content: Buffer.from(newContent).toString('base64'),
          sha: fileData.sha || undefined
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`更新失败: ${updateResponse.status} - ${errorText}`);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '留言提交成功！'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('提交留言失败:', error);
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
