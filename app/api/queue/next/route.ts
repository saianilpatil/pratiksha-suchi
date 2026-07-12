import { NextResponse } from 'next/server';
import {
  getTenantBySubdomain,
  getQueueForTenant,
  markAsServing,
  shiftPositions,
  markEmailSent,
} from '@/lib/sheets';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenant: subdomain } = body;

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Tenant required' },
        { status: 400 }
      );
    }

    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const queue = await getQueueForTenant(tenant.id);
    if (queue.length === 0) {
      return NextResponse.json(
        { error: 'No one in queue' },
        { status: 400 }
      );
    }

    const serving = queue[0];
    await markAsServing(serving.id);

    await sendEmail({
      to: serving.email,
      subject: `It's your turn at ${tenant.name}!`,
      body: `Hi ${serving.name},\n\nIt's your turn at ${tenant.name}!\nPlease proceed to the counter.\n\n— Pratiksha Suchi`,
    });
    await markEmailSent(serving.id, 'turn');

    const updatedQueue = await shiftPositions(tenant.id);

    for (let i = 0; i < Math.min(2, updatedQueue.length); i++) {
      const entry = updatedQueue[i];
      await sendEmail({
        to: entry.email,
        subject: `Queue update at ${tenant.name}`,
        body: `Hi ${entry.name},\n\nGood news! You moved up in the queue.\n\nYour new position: #${entry.position}\nEstimated wait: ~${entry.position * 10} minutes\n\n— Pratiksha Suchi`,
      });
    }

    return NextResponse.json({
      success: true,
      served: serving,
      queue: updatedQueue,
    });
  } catch (error) {
    console.error('Next error:', error);
    return NextResponse.json(
      { error: 'Failed to serve next' },
      { status: 500 }
    );
  }
}