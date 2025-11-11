import { getPreviewData, findLinearIdentifierInComment } from './github';
import { getLinearIssueId, setAttachment } from './linear';

async function main() {
    // TODO: The ref should be the pull request's branch or commit hash,
    // we need to get this from the action context
    const gitRef = 'c03ad5a3605e674bd61e65b4a72eada35c886b27';
    const ghIssueNumber = 3;
    const previewData = await getPreviewData(gitRef);

    // TODO: Get the actual GH issue number from context?
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
