import { context } from '@actions/github';
import { debug, info } from '@actions/core';

import { findLinearIdentifierInComment, getComments, getPullRequest, getPullRequestInfoFromEvent } from './github';
import { getLinearIssueId, setAttachment } from './linear';
import { getPreviewDataByProvider, getProvider } from './providers';

async function main() {
    debug(`Starting with context: ${JSON.stringify(context, null, 2)}`);

    const prInfo = getPullRequestInfoFromEvent();
    if (!prInfo) {
        // Skipping due to various reasons, see logs for details
        return;
    }

    const { ghIssueNumber } = prInfo;

    const comments = await getComments(ghIssueNumber);

    const provider = await getProvider(comments, ghIssueNumber);

    const linearIdentifier = await findLinearIdentifierInComment(comments);
    if (!linearIdentifier) {
        info('Skipping: linear identifier not found');
        return;
    }
    const previewData = await getPreviewDataByProvider(provider, ghIssueNumber, comments);
    if (!previewData) {
        info('Skipping: preview data not found');
        return;
    }

    const issue = await getLinearIssueId(linearIdentifier);

    // Fetch PR title if not already available (for deployment_status events)
    let title = prInfo.title;
    if (!title) {
        const pr = await getPullRequest(ghIssueNumber);
        title = pr.title;
    }

    const attachment = await setAttachment({
        issueId: issue.id,
        url: previewData.url,
        title: `Preview of PR #${ghIssueNumber}`,
        subtitle: title,
        avatar: previewData.avatar,
    });
    info(`Added attachment: ${JSON.stringify(attachment)}`);
    info('Done running');
}

main();
