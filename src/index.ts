import { context } from '@actions/github';

import { getPreviewData, findLinearIdentifierInComment } from './github';
import { getLinearIssueId, setAttachment } from './linear';

async function main() {
    console.log(context);
    const gitRef = context.ref;
    if (!gitRef) {
        console.error('No git ref found');
        throw new Error('No git ref found');
    }
    const ghIssueNumber = context.issue.number;
    const previewData = await getPreviewData(gitRef);
    const linearIdentifier = await findLinearIdentifierInComment(ghIssueNumber);
    const issue = await getLinearIssueId(linearIdentifier);

    // TODO: Can we get the PR title from context?
    await setAttachment({
        issueId: issue.id,
        url: previewData.url,
        title: `Preview of PR #${ghIssueNumber}`,
        subtitle: '',
        avatar: previewData.avatar,
    });
}

main();
