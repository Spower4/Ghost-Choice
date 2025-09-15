import { NextRequest, NextResponse } from 'next/server';
import { createGeminiImageClient } from '@/lib/api/gemini-image';
import { generatePlan } from '@/lib/api/gemini';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const message = formData.get('message') as string;
    const setupType = formData.get('setupType') as 'premium' | 'casual';
    const currency = formData.get('currency') as string;
    const minBudget = parseInt(formData.get('minBudget') as string);
    const maxBudget = parseInt(formData.get('maxBudget') as string);
    
    // Handle uploaded images
    const images: File[] = [];
    let imageIndex = 0;
    while (formData.get(`image_${imageIndex}`)) {
      const image = formData.get(`image_${imageIndex}`) as File;
      images.push(image);
      imageIndex++;
    }

    if (!message && images.length === 0) {
      return NextResponse.json(
        { error: 'Message or images required' },
        { status: 400 }
      );
    }

    let imageAnalysis = '';
    
    // Analyze images if provided
    if (images.length > 0) {
      try {
        const imagePromises = images.map(async (image) => {
          // For now, we'll create a simple analysis prompt
          // In a full implementation, you'd want to add image analysis capability to the Gemini client
          return `Reference image uploaded: ${image.name} (${image.type}) - This image will be used to inform the setup recommendations.`;
        });
        
        const analyses = await Promise.all(imagePromises);
        imageAnalysis = analyses.join('\n\n');
      } catch (error) {
        console.error('Image analysis error:', error);
        imageAnalysis = 'Images uploaded but analysis temporarily unavailable.';
      }
    }

    // Generate AI response
    const prompt = `
User Request: ${message}
Setup Type: ${setupType}
Budget: ${minBudget}-${maxBudget} ${currency}
${imageAnalysis ? `\nImage Analysis:\n${imageAnalysis}` : ''}

Based on this information, provide helpful recommendations for their setup. Consider their budget, setup type preference, and any visual references provided.
`;

    const aiResponse = await generatePlan(prompt, setupType, currency, minBudget, maxBudget);

    return NextResponse.json({
      response: aiResponse,
      imageAnalysis: imageAnalysis || null,
      metadata: {
        setupType,
        currency,
        minBudget,
        maxBudget,
        imagesAnalyzed: images.length
      }
    });

  } catch (error) {
    console.error('AI Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI chat request' },
      { status: 500 }
    );
  }
}