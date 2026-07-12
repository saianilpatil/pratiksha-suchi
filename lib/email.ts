export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 EMAIL SENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('To:      ', to);
  console.log('Subject: ', subject);
  console.log('Body:    ', body);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  return { success: true, id: 'mock-' + Date.now() };
}

export function getStatusEmailTemplate(
  status: string,
  name: string,
  businessName: string,
  position?: number
) {
  switch (status) {
    case 'waiting':
      return {
        subject: `You are in line at ${businessName}`,
        body: `Hi ${name},\n\nYou have joined the queue at ${businessName}.\n\n${position ? `Your position: #${position}\nEstimated wait: ~${position * 10} minutes\n\n` : ''}We will email you with updates.\n\n— Pratiksha Suchi`,
      };
    case 'checkedin':
      return {
        subject: `You are checked in at ${businessName}`,
        body: `Hi ${name},\n\nYou have been checked in at ${businessName}.\n\nPlease have a seat in the lobby. We will call you when it is your turn.\n\n— Pratiksha Suchi`,
      };
    case 'serving':
      return {
        subject: `It is your turn at ${businessName}!`,
        body: `Hi ${name},\n\nIt is your turn at ${businessName}!\nPlease proceed to the service counter now.\n\n— Pratiksha Suchi`,
      };
    case 'served':
      return {
        subject: `Thank you for visiting ${businessName}`,
        body: `Hi ${name},\n\nThank you for visiting ${businessName}. We hope you had a great experience.\n\n— Pratiksha Suchi`,
      };
    default:
      return { subject: '', body: '' };
  }
}