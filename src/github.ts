import { getOctokit, context } from '@actions/github';
import { getInput, debug, info } from '@actions/core';

export interface PullRequestInfo {
    ghIssueNumber: number;
    title: string | undefined;
}

export function getPullRequestInfoFromEvent(): PullRequestInfo | null {
    // Handle different event types
    if (context.eventName === 'issue_comment') {
        // Only run if the comment is on a pull request (ignore issue comments)
        if (!context.payload.issue?.pull_request) {
            info('Skipping: comment is not on a pull request');
            return null;
        }
        return {
            ghIssueNumber: context.issue.number,
            title: context.payload.issue?.title,
        };
    } else if (context.eventName === 'deployment_status') {
        // Extract PR number from deployment payload
        const pullRequests = context.payload.deployment?.pull_requests;
        if (!pullRequests || pullRequests.length === 0) {
            info('Skipping: deployment is not associated with a pull request');
            return null;
        }
        return {
            ghIssueNumber: pullRequests[0].number,
            title: undefined, // Title will be fetched later if needed
        };
    } else {
        info(`Skipping: unsupported event type ${context.eventName}`);
        return null;
    }
}

async function getClient() {
    const API_TOKEN = getInput('GITHUB_TOKEN', { required: true });
    return getOctokit(API_TOKEN);
}

export async function getPullRequest(ghIssueNumber: number) {
    const octokit = await getClient();
    const pull = await octokit.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: ghIssueNumber,
    });
    debug(`Pull data: ${JSON.stringify(pull.data)}`);
    return pull.data;
}

export async function getGitSha(ghIssueNumber: number) {
    debug(`Getting git ref for issue number: ${ghIssueNumber}`);
    const pull = await getPullRequest(ghIssueNumber);
    return pull.head.sha;
}

export async function getDeployment(ref: string) {
    const octokit = await getClient();
    debug(`Getting deployment for ref (SHA): ${ref}`);
    const deployments = await octokit.rest.repos.listDeployments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref,
        // TODO: Should we add this filter to ensure we dont get a production deployment link?
        // Given that a new PR merge triggers a new SHA, it might not be needed
        // environment: 'preview',
    });
    debug(`Deployments: ${JSON.stringify(deployments.data)}`);
    const deployment = deployments.data[0];
    if (!deployment) {
        console.error('No deployment found for the ref');
        return null;
    }
    if (deployments.data.length > 1) {
        console.error('Multiple deployments found for the same ref');
        return null;
    }
    return deployment;
}

export async function getGitHubDeploymentData(ghIssueNumber: number) {
    const gitSha = await getGitSha(ghIssueNumber);
    const deployment = await getDeployment(gitSha);
    if (!deployment) {
        console.error('No deployment found for the ref');
        return null;
    }
    const deploymentId = deployment.id;

    const octokit = await getClient();
    const statuses = await octokit.rest.repos.listDeploymentStatuses({
        owner: context.repo.owner,
        repo: context.repo.repo,
        deployment_id: deploymentId,
    });
    const status = statuses.data[0];

    if (!status) {
        console.error('No deployment status found for the deployment');
        return null;
    }
    if (status.state !== 'success') {
        console.error('Deployment status is not success');
        return null;
    }
    if (!status.environment_url) {
        console.error('No environment URL found for the deployment');
        return null;
    }
    return { url: status.environment_url, avatar: status.creator?.avatar_url };
}

export async function getComments(ghIssueNumber: number) {
    const octokit = await getClient();
    const comments = await octokit.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: ghIssueNumber,
    });
    return comments.data;
}

export async function findLinearIdentifierInComment(comments: any[]) {
    // Find the relevant Linear issue comment inside the pull request from the bot

    for (const comment of comments) {
        if (comment.user?.login === 'linear[bot]') {
            // Body example: <p><a href=\"https://linear.app/preview-test/issue/PRE-7/add-functionality-for-detecting-a-linear-identifier\">PRE-7 Add functionality for detecting a Linear identifier</a></p>
            const link = comment.body?.match(/https:\/\/linear\.app\/[^"]+/)?.[0];

            if (link) {
                const parts = link.replace('https://linear.app/', '').split('/');
                const [_team, _, identifier, _title] = parts;
                return identifier as string;
            } else {
                console.error('No link found in the comment');
                return null;
            }
        }
    }
    console.error('No linear identifier found in the comment');
    return null;
}
