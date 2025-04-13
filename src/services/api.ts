import axios from 'axios';
import { DEEPSEEK_API_KEY, DEEPSEEK_API_URL } from '../config';

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const api = axios.create({
  baseURL: DEEPSEEK_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
  }
});

export const generateSuggestions = async (note: string): Promise<string[]> => {
  try {
    const response = await api.post<DeepSeekResponse>('', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个智能日记助手，帮助用户完善他们的日记内容。请根据用户输入的内容，生成3个相关的建议提示，每个建议都应该简洁明了，能够引导用户展开写作。'
        },
        {
          role: 'user',
          content: note
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const suggestions = response.data.choices[0].message.content
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim());

    return suggestions;
  } catch (error) {
    console.error('Error generating suggestions:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('API 密钥无效或未授权');
      }
      throw new Error(`API 调用失败: ${error.response?.data?.error?.message || error.message}`);
    }
    throw error;
  }
};

export const expandSuggestion = async (note: string, suggestion: string): Promise<string> => {
  try {
    const response = await api.post<DeepSeekResponse>('', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个智能日记助手，帮助用户完善他们的日记内容。请根据用户当前的日记内容和选中的建议，生成一段详细的、有启发性的内容，帮助用户更好地展开这个话题。'
        },
        {
          role: 'user',
          content: `当前日记内容：${note}\n\n选中的建议：${suggestion}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error expanding suggestion:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('API 密钥无效或未授权');
      }
      throw new Error(`API 调用失败: ${error.response?.data?.error?.message || error.message}`);
    }
    throw error;
  }
}; 