import { context } from '@actions/github';
import { debug, info } from '@actions/core';

import {
    findLinearIdentifierInComment,
    getDeploymentData,
    getGitSha,
} from './github';
import { getLinearIssueId, setAttachment } from './linear';

async function main() {
    debug(`Starting with context: ${JSON.stringify(context, null, 2)}`);
    // Only run if the comment is on a pull request
    if (!context.payload.issue?.pull_request) {
        info('Skipping: comment is not on a pull request');
        return;
    }

    const ghIssueNumber = context.issue.number;

    const gitSha = await getGitSha(ghIssueNumber);
    const deploymentData = await getDeploymentData(gitSha);

    // TODO: Could we potentially get the linear identifier from context of the comment instead?
    // But maybe we want to actually have both, in case a preview provider adds a comment to the PR about a new deployment being available.
    const linearIdentifier = await findLinearIdentifierInComment(ghIssueNumber);

    info(JSON.stringify(deploymentData));
    info(JSON.stringify(linearIdentifier));
    const issue = await getLinearIssueId(linearIdentifier);

    const title = context.payload.issue?.title;

    const attachment = await setAttachment({
        issueId: issue.id,
        url: deploymentData.url,
        title: `Preview of PR #${ghIssueNumber}`,
        subtitle: title,
        avatar: deploymentData.avatar,
    });
    info(`Added attachment: ${JSON.stringify(attachment)}`);
    info('Done running');
}

main();
