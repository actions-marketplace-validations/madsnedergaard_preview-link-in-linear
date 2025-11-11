import { LinearClient } from '@linear/sdk';

// Api key authentication
const client = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
});

export async function getLinearIssueId(issueId: string) {
    const issue = await client.issue(issueId);
    return issue;
}

type AttachmentData = {
    issueId: string;
    title: string;
    subtitle: string;
    url: string;
    avatar: string | undefined;
};
export async function setAttachment({ issueId, url, title, subtitle, avatar }: AttachmentData) {
    const result = await client.createAttachment({
        issueId,
        title,
        subtitle,
        url,
        iconUrl: avatar ?? undefined,
    });

    if (result.success) {
        const createdAttachment = await result.attachment;
        if (createdAttachment) {
            console.log(`Attachment created with ID: ${createdAttachment.id}`);
            return createdAttachment;
        } else {
            console.error('Failed to create attachment: attachment is null');
            throw new Error('Failed to create attachment: attachment is null');
        }
    } else {
        console.error('Failed to create attachment');
        throw new Error('Failed to create attachment');
    }
}
