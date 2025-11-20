import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCoordinator } from '@/lib/agents/coordinator';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json') as 'csv' | 'json';
    
    const coordinator = getCoordinator();
    const context = coordinator.createContext(session);
    
    const result = await coordinator.executeAgent('export', context, {
      format,
    });
    
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to export books' },
        { status: 500 }
      );
    }
    
    const exportData = result.data;
    
    if (format === 'csv') {
      return new NextResponse(exportData.content as string, {
        headers: {
          'Content-Type': exportData.mimeType,
          'Content-Disposition': `attachment; filename="${exportData.filename}"`,
        },
      });
    } else {
      return NextResponse.json(exportData.content, {
        headers: {
          'Content-Disposition': `attachment; filename="${exportData.filename}"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting books:', error);
    return NextResponse.json(
      { error: 'Failed to export books' },
      { status: 500 }
    );
  }
}






